import React from 'react'

export const VoiceButton = ({ onClick, children, ...props }: any) => {
  return (
    <button {...props} onClick={onClick} aria-label="Voice">
      {children || 'Voice'}
    </button>
  )
}

export default VoiceButton
