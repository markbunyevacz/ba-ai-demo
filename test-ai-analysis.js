/**
 * Test script for AI Analysis Service
 * Tests the LLM integration with sample document content
 * 
 * Usage: node test-ai-analysis.js
 * Prerequisites: OPENAI_API_KEY must be set in .env file
 */

import dotenv from 'dotenv'
import AIAnalysisService from './src/services/aiAnalysisService.js'
import DocumentParser from './src/services/documentParser.js'

dotenv.config()

// Sample test document in Hungarian
const testDocument = `
Média monitoring és elemzési adatbázis koncepció
BUDAPEST, 2024.12.16

1. Bevezetés
A projekt célja egy központi média monitoring és elemzési adatbázis kialakítása.

2. Felhasználói követelmények

2.1 User Story - Elemzői nézet
Mint Business Analyst, szeretném látni a média monitoring eredményeket egy átlátható dashboardon, 
hogy elemezni tudjam a projekthez kapcsolódó híreket és trendeket.

Elfogadási kritériumok:
- Dashboard megjelenítése valós időben
- Szűrési lehetőségek (dátum, forrás, kategória)
- Exportálás Excel formátumba

2.2 User Story - Riport generálás
Mint Projekt Menedzser, szeretnék automatikus heti riportokat kapni email-ben,
hogy nyomon követhessem a média megjelenéseket anélkül, hogy manuálisan kellene keresnem.

Elfogadási kritériumok:
- Heti automatikus email kiküldés
- Összefoglaló statisztikák
- Top 5 legfontosabb hír kiemelése

3. Funkcionális követelmények

3.1 Adatgyűjtés
A rendszer képes legyen különböző média forrásokból (online portálok, social media, nyomtatott sajtó) 
adatok automatikus aggregálására.

Prioritás: Magas
Elfogadási kritérium: Naponta minimum 3 forrásból történő adatgyűjtés

3.2 Kategorizálás
Automatikus kategorizálás és címkézés AI alapú szövegfeldolgozással.

Prioritás: Közepes

4. Technikai követelmények
- PostgreSQL adatbázis
- REST API backend (Node.js)
- React frontend
- Docker konténerizáció

5. Ütemterv
- Fázis 1: Adatbázis tervezés (2 hét)
- Fázis 2: Backend fejlesztés (4 hét)
- Fázis 3: Frontend fejlesztés (3 hét)
- Fázis 4: Tesztelés és élesítés (2 hét)
`

async function runTests() {
  console.log('='.repeat(80))
  console.log('AI ANALYSIS SERVICE - TEST SUITE')
  console.log('='.repeat(80))
  console.log()

  // Check if API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY not found in environment variables')
    console.error('Please create a .env file with your OpenAI API key:')
    console.error('OPENAI_API_KEY=sk-...')
    console.error()
    console.error('See OPENAI_CONFIGURATION.md for setup instructions')
    process.exit(1)
  }

  console.log('✓ OpenAI API key configured')
  console.log('✓ Model:', process.env.OPENAI_MODEL || 'gpt-4-turbo-preview')
  console.log()

  try {
    // Test 1: Direct AIAnalysisService test
    console.log('TEST 1: Document Structure Analysis')
    console.log('-'.repeat(80))
    
    const aiService = new AIAnalysisService()
    const structureResult = await aiService.analyzeDocumentStructure(testDocument)
    
    console.log('✓ Structure analysis complete')
    console.log(`  Confidence: ${structureResult.confidence}`)
    console.log(`  Epics found: ${structureResult.epics?.length || 0}`)
    console.log(`  Stories found: ${structureResult.stories?.length || 0}`)
    console.log(`  Features found: ${structureResult.features?.length || 0}`)
    console.log(`  Tasks found: ${structureResult.tasks?.length || 0}`)
    
    if (structureResult.summary) {
      console.log(`  Summary: ${structureResult.summary}`)
    }
    
    if (structureResult._meta) {
      console.log(`  Duration: ${structureResult._meta.duration}ms`)
      console.log(`  Tokens used: ${structureResult._meta.tokensUsed}`)
      console.log(`  Estimated cost: $${structureResult._meta.estimatedCost}`)
    }
    console.log()

    // Test 2: DocumentParser integration test
    console.log('TEST 2: DocumentParser Integration')
    console.log('-'.repeat(80))
    
    const parser = new DocumentParser()
    const parseResult = await parser.analyzeWithAI(testDocument, {
      ticketPrefix: 'TEST',
      ticketNumber: 1001
    })
    
    console.log('✓ Parser analysis complete')
    console.log(`  AI Powered: ${parseResult.metadata.aiPowered}`)
    console.log(`  Confidence: ${parseResult.metadata.confidence}`)
    console.log(`  Tickets generated: ${parseResult.tickets.length}`)
    console.log(`  Epics: ${parseResult.epics?.length || 0}`)
    
    if (parseResult.metadata.costStats) {
      console.log(`  Total cost: $${parseResult.metadata.costStats.estimatedCost}`)
      console.log(`  API calls: ${parseResult.metadata.costStats.callCount}`)
    }
    console.log()

    // Display generated tickets
    if (parseResult.tickets.length > 0) {
      console.log('GENERATED TICKETS:')
      console.log('-'.repeat(80))
      parseResult.tickets.forEach((ticket, index) => {
        console.log(`${index + 1}. [${ticket.id}] ${ticket.type || 'Ticket'}`)
        console.log(`   ${ticket.summary}`)
        console.log(`   Priority: ${ticket.priority} | Epic: ${ticket.epic}`)
        if (ticket.acceptanceCriteria && ticket.acceptanceCriteria.length > 0) {
          console.log(`   Acceptance Criteria: ${ticket.acceptanceCriteria.length} item(s)`)
        }
        console.log()
      })
    }

    // Display epics
    if (parseResult.epics && parseResult.epics.length > 0) {
      console.log('IDENTIFIED EPICS:')
      console.log('-'.repeat(80))
      parseResult.epics.forEach((epic, index) => {
        console.log(`${index + 1}. ${epic.name}`)
        console.log(`   ${epic.description}`)
        console.log(`   Priority: ${epic.priority || 'N/A'}`)
        console.log(`   Stories: ${epic.stories?.length || 0}`)
        console.log()
      })
    }

    // Display strategic insights
    if (parseResult.strategicInsights && !parseResult.strategicInsights.fallback) {
      console.log('STRATEGIC INSIGHTS:')
      console.log('-'.repeat(80))
      if (parseResult.strategicInsights.executiveSummary) {
        console.log(`Summary: ${parseResult.strategicInsights.executiveSummary}`)
        console.log()
      }
      
      if (parseResult.strategicInsights.recommendations?.length > 0) {
        console.log('Top Recommendations:')
        parseResult.strategicInsights.recommendations.slice(0, 3).forEach((rec, index) => {
          console.log(`${index + 1}. [${rec.priority}] ${rec.action}`)
          console.log(`   ${rec.rationale}`)
        })
        console.log()
      }
    }

    // Display process flow
    if (parseResult.processFlow && !parseResult.processFlow.fallback) {
      console.log('PROCESS FLOW:')
      console.log('-'.repeat(80))
      if (parseResult.processFlow.processName) {
        console.log(`Process: ${parseResult.processFlow.processName}`)
      }
      console.log(`Steps: ${parseResult.processFlow.steps?.length || 0}`)
      console.log(`Gateways: ${parseResult.processFlow.gateways?.length || 0}`)
      
      const swimlanes = parseResult.processFlow.swimlanes || {}
      const swimlaneCount = Object.keys(swimlanes).length
      if (swimlaneCount > 0) {
        console.log(`Swimlanes: ${swimlaneCount}`)
        Object.entries(swimlanes).forEach(([role, steps]) => {
          console.log(`  - ${role}: ${steps.length} step(s)`)
        })
      }
      console.log()
    }

    console.log('='.repeat(80))
    console.log('✓ ALL TESTS PASSED')
    console.log('='.repeat(80))
    console.log()
    console.log('Cost Summary:', aiService.getCostStats())
    console.log()
    console.log('Next steps:')
    console.log('1. Start the server: npm run server')
    console.log('2. Upload a Word document via the UI')
    console.log('3. Check the AI-generated tickets and analysis')
    
  } catch (error) {
    console.error()
    console.error('❌ TEST FAILED')
    console.error('='.repeat(80))
    console.error('Error:', error.message)
    console.error()
    
    if (error.code === 'insufficient_quota') {
      console.error('Your OpenAI account has insufficient quota.')
      console.error('Please check your billing at: https://platform.openai.com/account/billing')
    } else if (error.code === 'invalid_api_key') {
      console.error('Invalid OpenAI API key.')
      console.error('Please check your .env file and verify the API key.')
    } else {
      console.error('Stack trace:')
      console.error(error.stack)
    }
    
    process.exit(1)
  }
}

// Run tests
runTests().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})

