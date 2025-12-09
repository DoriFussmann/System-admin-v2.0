import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    // Get workflow ID from request body or use default
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      // Body might be empty, that's okay
    }
    const requestedWorkflowId = body.workflowId;
    
    // Determine which workflow ID to use
    let workflowId: string | undefined;
    let workflowIdName: string;
    
    if (requestedWorkflowId === 'bananhot') {
      // Use BananHot-specific workflow ID
      workflowId = process.env.WORKFLOW_ID_BANANHOT;
      workflowIdName = 'WORKFLOW_ID_BANANHOT';
    } else {
      // Use default workflow ID (for NuBrace and others)
      workflowId = process.env.WORKFLOW_ID;
      workflowIdName = 'WORKFLOW_ID';
    }

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    if (!workflowId) {
      return NextResponse.json(
        { error: `${workflowIdName} not configured. Please add it to your .env.local file.` },
        { status: 500 }
      );
    }

    const requestBody = {
      workflow: {
        id: workflowId,
      },
      user: 'anonymous-user-' + Date.now(),
    };

    const response = await fetch('https://api.openai.com/v1/chatkit/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'chatkit_beta=v1',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI ChatKit API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create ChatKit session', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      client_secret: data.client_secret,
    });

  } catch (error) {
    console.error('ChatKit session creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

