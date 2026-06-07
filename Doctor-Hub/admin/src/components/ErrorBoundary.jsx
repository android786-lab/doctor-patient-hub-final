import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8 text-center">
          <h1 className="font-display text-xl font-semibold text-slate-900">
            Staff portal failed to load
          </h1>
          <p className="mt-2 max-w-md text-sm text-red-600">{this.state.error.message}</p>
          <button
            type="button"
            className="dh-btn mt-6"
            onClick={() => {
              localStorage.removeItem('aToken')
              localStorage.removeItem('dToken')
              localStorage.removeItem('token')
              window.location.href = '/'
            }}
          >
            Clear session & reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
