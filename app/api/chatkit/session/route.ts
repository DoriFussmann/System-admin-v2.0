import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const workflowId = process.env.WORKFLOW_ID;

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    if (!workflowId) {
      return NextResponse.json(
        { error: 'WORKFLOW_ID not configured' },
        { status: 500 }
      );
    }

<<<<<<< HEAD
=======
    // Call OpenAI ChatKit Sessions API
>>>>>>> 8a4857bbd6805340ad535703c76c6b4690d27f5b
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

<<<<<<< HEAD
=======

>>>>>>> 8a4857bbd6805340ad535703c76c6b4690d27f5b
