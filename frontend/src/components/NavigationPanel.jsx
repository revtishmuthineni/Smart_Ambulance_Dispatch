export default function NavigationPanel({ steps }) {
  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#fff',
      borderTop: '2px solid #007bff',
      padding: '15px',
      maxHeight: '25vh',
      overflowY: 'auto',
      boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
      zIndex: 100
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>📍 Turn-by-Turn Navigation</h3>
      <ol style={{ margin: 0, paddingLeft: '20px', color: '#555' }}>
        {steps.map((step, idx) => (
          <li key={idx} style={{ marginBottom: '8px', fontSize: '14px' }}>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
