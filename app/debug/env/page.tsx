
export const dynamic = 'force-dynamic';

export default function DebugEnvPage() {
    const vars = [
        'DATABASE_URL',
        'DIRECT_URL',
        'GOOGLE_DRIVE_FOLDER_ID',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'GOOGLE_REFRESH_TOKEN'
    ];

    const status = vars.map(key => ({
        key,
        exists: !!process.env[key],
        length: process.env[key]?.length || 0
    }));

    return (
        <div style={{ padding: '40px', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', marginBottom: '20px', borderBottom: '2px solid #ccc' }}>Environment Debugger</h1>

            <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
                {status.map((item) => (
                    <div key={item.key} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '10px 0',
                        borderBottom: '1px solid #eee',
                        color: item.exists ? 'green' : 'red',
                        fontWeight: 'bold'
                    }}>
                        <span>{item.key}</span>
                        <span>
                            {item.exists ? `✅ OK (${item.length} chars)` : '❌ MISSING'}
                        </span>
                    </div>
                ))}
            </div>

            <p style={{ marginTop: '20px', color: '#666' }}>
                If any are MISSING, go to Vercel Settings -> Environment Variables and add them.
                <br />
                Then <strong>Redeploy</strong>.
            </p>
        </div>
    );
}
