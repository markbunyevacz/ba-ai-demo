const SuccessModal = ({ isOpen, tickets, onClose, onConfirm }) => {
  if (!isOpen) return null

  const ticketCount = tickets.length
  const ticketIds = tickets.map(ticket => ticket.id).filter(Boolean)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md mx-4 w-full transform animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Jira Ticketek Létrehozása
            </h3>
            <p className="text-slate-600">
              Készen állsz a {ticketCount} ticket Jira-ba küldésére?
            </p>
          </div>

          {/* Ticket List */}
          {ticketIds.length > 0 && (
            <div className="mb-6">
              <div className="bg-slate-50 rounded-lg p-4 max-h-32 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {ticketIds.map((ticketId, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-md px-3 py-2 text-sm font-mono font-semibold text-[#003366] border border-slate-200 shadow-sm"
                    >
                      {ticketId}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-400 transition-colors"
            >
              Visszavonás
            </button>

            <button
              onClick={onConfirm}
              className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-[#003366] text-white text-sm font-semibold rounded-lg hover:bg-[#002244] transition-colors"
            >
              Jira-ba Küldés
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SuccessModal
