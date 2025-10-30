"""Business Analysis workflow orchestration using LangGraph."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from models.agents.document_agent import DocumentAgent
from models.agents.ticket_agent import TicketAgent
from services.compliance_service import ComplianceService
from services.monitoring_service import MonitoringService


class WorkflowState(TypedDict, total=False):
    """State shared between workflow nodes."""

    tickets: List[Dict[str, Any]]
    refined_tickets: List[Dict[str, Any]]
    documents: List[Dict[str, Any]]
    document_insights: List[Dict[str, Any]]
    compliance_report: Dict[str, Any]
    metadata: Dict[str, Any]
    errors: List[str]
    session_id: Optional[str]


@dataclass
class BAWorkflow:
    """LangGraph workflow coordinating AI agents and rule-based services."""

    ticket_agent: TicketAgent
    compliance_service: ComplianceService
    monitoring_service: Optional[MonitoringService] = None
    document_agent: Optional[DocumentAgent] = None
    enhance_tickets: bool = True

    _graph: StateGraph = field(init=False)
    _compiled: Any = field(init=False)

    def __post_init__(self) -> None:
        self._graph = StateGraph(WorkflowState)
        self._register_nodes()
        self._compiled = self._graph.compile()

    async def run(
        self,
        tickets: List[Dict[str, Any]],
        documents: Optional[List[Dict[str, Any]]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> WorkflowState:
        """Execute the workflow asynchronously."""
        initial_state: WorkflowState = {
            "tickets": tickets,
            "documents": documents or [],
            "metadata": metadata or {},
            "errors": [],
        }

        # Register monitoring session if available
        if self.monitoring_service:
            session_id = self.monitoring_service.track_request(
                {
                    "workflow": "BAWorkflow",
                    "tickets": len(tickets),
                    "documents": len(initial_state["documents"]),
                    "metadata": metadata or {},
                    "type": "workflow_run",
                }
            )
            initial_state["session_id"] = session_id

        result_state: WorkflowState = await self._compiled.ainvoke(initial_state)

        if self.monitoring_service and initial_state.get("session_id"):
            payload = {
                "success": len(result_state.get("errors", [])) == 0,
                "ticketsEvaluated": len(result_state.get("refined_tickets", [])),
                "averageScore": result_state.get("compliance_report", {}).get("overallScore", 0),
                "documentsAnalyzed": len(result_state.get("document_insights", [])),
                "hasCompliance": bool(result_state.get("compliance_report")),
            }
            self.monitoring_service.track_completion(
                initial_state["session_id"],
                payload,
            )

        return result_state

    def _register_nodes(self) -> None:
        """Configure workflow nodes and transitions."""
        self._graph.add_node("refine_tickets", self._refine_tickets)
        self._graph.add_node("analyze_documents", self._analyze_documents)
        self._graph.add_node("compliance", self._compliance_check)
        self._graph.add_node("finalize", self._finalize)

        self._graph.add_edge(START, "refine_tickets")
        self._graph.add_conditional_edges(
            "refine_tickets",
            self._should_analyze_documents,
            {
                "analyze": "analyze_documents",
                "skip": "compliance",
            },
        )
        self._graph.add_edge("analyze_documents", "compliance")
        self._graph.add_edge("compliance", "finalize")
        self._graph.add_edge("finalize", END)

    async def _refine_tickets(self, state: WorkflowState) -> Dict[str, Any]:
        tickets = state.get("tickets", [])
        if not tickets:
            return {"refined_tickets": [], "ticket_metrics": {"processed": 0}}

        result = await self.ticket_agent.batch_process_tickets(
            tickets,
            source_data=state.get("metadata"),
        )

        refined: List[Dict[str, Any]] = []
        errors = list(state.get("errors", []))

        for ticket in result.get("tickets", []):
            if ticket.get("status") == "failed":
                errors.append(
                    f"Ticket {ticket.get('id', 'unknown')} failed: {ticket.get('error')}"
                )
            else:
                refined.append(ticket)

        return {
            "refined_tickets": refined,
            "ticket_metrics": {
                "total": result.get("total", len(tickets)),
                "processed": result.get("processed", len(refined)),
                "enhanced": result.get("enhanced", 0),
                "failed": result.get("failed", 0),
            },
            "errors": errors,
        }

    async def _analyze_documents(self, state: WorkflowState) -> Dict[str, Any]:
        documents = state.get("documents", [])
        if not documents or not self.document_agent:
            return {"document_insights": []}

        insights: List[Dict[str, Any]] = []
        errors = list(state.get("errors", []))

        for doc in documents:
            if isinstance(doc, dict):
                content = doc.get("content") or doc.get("text", "")
                metadata = {k: v for k, v in doc.items() if k not in {"content", "text"}}
            else:
                content = str(doc)
                metadata = {}

            summary = await self.document_agent.summarize_document(content, metadata=metadata)
            if summary.get("error"):
                errors.append(summary["error"])
            insights.append(summary)

        return {"document_insights": insights, "errors": errors}

    async def _compliance_check(self, state: WorkflowState) -> Dict[str, Any]:
        refined = state.get("refined_tickets", [])
        errors = list(state.get("errors", []))

        evaluations: List[Dict[str, Any]] = []
        for ticket in refined:
            try:
                evaluation = self.compliance_service.evaluate_ticket(ticket)
                evaluations.append({
                    "ticketId": ticket.get("id"),
                    "status": evaluation.get("status"),
                    "score": evaluation.get("score"),
                    "gaps": evaluation.get("gaps"),
                    "recommendations": evaluation.get("recommendations"),
                })
            except Exception as exc:
                errors.append(f"Compliance evaluation failed for {ticket.get('id')}: {exc}")

        return {
            "compliance_report": {
                "tickets": evaluations,
                "overallScore": self._calculate_overall_score(evaluations),
                "status": self._determine_overall_status(evaluations),
            },
            "errors": errors,
        }

    async def _finalize(self, state: WorkflowState) -> Dict[str, Any]:
        return {
            "result": {
                "tickets": state.get("refined_tickets", []),
                "documents": state.get("document_insights", []),
                "compliance": state.get("compliance_report", {}),
                "errors": state.get("errors", []),
                "metadata": state.get("metadata", {}),
                "metrics": state.get("ticket_metrics", {}),
            }
        }

    def _should_analyze_documents(self, state: WorkflowState) -> str:
        documents = state.get("documents") or []
        if self.document_agent and documents:
            return "analyze"
        return "skip"

    @staticmethod
    def _calculate_overall_score(evaluations: List[Dict[str, Any]]) -> float:
        if not evaluations:
            return 0.0
        scores = [item.get("score", 0) for item in evaluations]
        return sum(scores) / max(len(scores), 1)

    @staticmethod
    def _determine_overall_status(evaluations: List[Dict[str, Any]]) -> str:
        if not evaluations:
            return "unknown"

        status_priority = {"compliant": 3, "partial": 2, "gap": 1}
        min_status = min(
            (status_priority.get(item.get("status"), 0) for item in evaluations),
            default=0,
        )
        inverse_map = {v: k for k, v in status_priority.items()}
        return inverse_map.get(min_status, "unknown")
