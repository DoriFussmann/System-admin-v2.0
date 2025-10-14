import React from 'react'
import Link from 'next/link'
import withPageAccess from '../lib/withPageAccess'

function AgentKitChatBoxPage() {
  return (
    <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff', paddingTop: 16, paddingBottom: 16 }}>
        <div className="layout">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
              <Link className="btn btn-sm" href="/">
                Home
              </Link>
            </div>
          </div>
        </div>
      </header>
      <div style={{ flex: 1, minHeight: 0 }} />
    </main>
  )
}

export default withPageAccess(AgentKitChatBoxPage, 'agentkit-chat-box')


