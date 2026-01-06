import React, { useState } from 'react';

type Props = {
  onUserInput?: (text: string) => void;
};

export default function CommandBar({ onUserInput }: Props) {
  const [text, setText] = useState('');

  return (
    <div id="command-bar" style={{ padding: 8, borderTop: '1px solid #222' }}>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (!onUserInput) return;
          onUserInput(text);
          setText('');
        }}
      >
        <input
          aria-label="command-input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter command"
          style={{ width: '80%', padding: 8 }}
        />
        <button type="submit" style={{ marginLeft: 8, padding: '8px 12px' }}>
          Send
        </button>
      </form>
    </div>
  );
}
