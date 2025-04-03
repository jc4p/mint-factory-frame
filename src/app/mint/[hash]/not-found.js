export default function NotFound() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      height: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1>Collection Not Found</h1>
      <p>The NFT collection you're looking for doesn't exist or has been removed.</p>
      <a 
        href="/"
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#3498db',
          color: 'white',
          borderRadius: '5px',
          textDecoration: 'none'
        }}
      >
        Go Home
      </a>
    </div>
  );
}