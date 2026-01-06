// v1 stub: AgentOverlay deferred to src/_deferred/agent/AgentOverlay.tsx
export function AgentOverlay(_props: any) {
  return null;
}

export default AgentOverlay;
                    <div className="mb-1 flex items-center gap-2">
                      {entry.approved ? (
                        <CheckCircle2 size={14} className="text-green-400" />
                      ) : (
                        <XCircle size={14} className="text-red-400" />
                      )}
                      <span className="text-sm font-medium text-gray-200">{entry.action.type}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          entry.action.risk === 'high'
                            ? 'bg-red-500/20 text-red-400'
                            : entry.action.risk === 'medium'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {entry.action.risk}
                      </span>
                    </div>
                    <div className="mb-1 text-xs text-gray-400">{entry.action.description}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()} • {entry.origin}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
