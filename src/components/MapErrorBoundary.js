import React from 'react';
import { Alert, Button } from 'react-bootstrap';

class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Map Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Log error untuk debugging
    if (window.console && window.console.error) {
      console.error('Leaflet Error Details:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));

    // Force re-render dengan key yang berbeda
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleRefresh = () => {
    // Clear any Leaflet-related data dari localStorage
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('leaflet') || key.includes('map')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Could not clear localStorage:', e);
    }

    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isLeafletError = this.state.error?.message?.includes('_leaflet_pos') || 
                            this.state.error?.message?.includes('leaflet') ||
                            this.state.error?.stack?.includes('leaflet');

      return (
        <div className="d-flex align-items-center justify-content-center" 
             style={{ height: this.props.height || '400px', width: '100%' }}>
          <div className="text-center p-4">
            <Alert variant="danger">
              <Alert.Heading>
                <i className="fas fa-exclamation-triangle me-2"></i>
                Error pada Peta
              </Alert.Heading>
              <p className="mb-3">
                {isLeafletError ? (
                  <>
                    Terjadi kesalahan pada komponen peta Leaflet. Ini biasanya disebabkan oleh:
                  </>
                ) : (
                  <>
                    Terjadi kesalahan pada aplikasi:
                  </>
                )}
              </p>
              
              {isLeafletError && (
                <ul className="text-start mb-3">
                  <li>Perubahan state yang terlalu cepat</li>
                  <li>Komponen peta di-unmount sebelum selesai loading</li>
                  <li>Konflik dengan library JavaScript lain</li>
                  <li>Browser cache yang corrupt</li>
                </ul>
              )}

              <div className="small text-muted mb-3">
                <details>
                  <summary style={{ cursor: 'pointer' }}>
                    Detail Error (untuk developer)
                  </summary>
                  <div className="mt-2 p-2 bg-light rounded text-start">
                    <strong>Error:</strong> {this.state.error?.message}<br/>
                    <strong>Retry Count:</strong> {this.state.retryCount}<br/>
                    {this.state.error?.stack && (
                      <>
                        <strong>Stack:</strong> 
                        <pre className="small mt-1" style={{ fontSize: '0.7em' }}>
                          {this.state.error.stack.substring(0, 500)}...
                        </pre>
                      </>
                    )}
                  </div>
                </details>
              </div>

              <hr />
              
              <div className="d-flex gap-2 justify-content-center flex-wrap">
                <Button 
                  variant="primary" 
                  onClick={this.handleRetry}
                  disabled={this.state.retryCount >= 3}
                >
                  <i className="fas fa-redo me-1"></i>
                  Coba Lagi {this.state.retryCount > 0 && `(${this.state.retryCount}/3)`}
                </Button>
                
                <Button 
                  variant="secondary" 
                  onClick={this.handleRefresh}
                >
                  <i className="fas fa-refresh me-1"></i>
                  Refresh Halaman
                </Button>

                {this.props.onFallback && (
                  <Button 
                    variant="outline-secondary" 
                    onClick={this.props.onFallback}
                  >
                    <i className="fas fa-list me-1"></i>
                    Tampilan List
                  </Button>
                )}
              </div>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;