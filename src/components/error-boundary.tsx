import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/async-grid'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches a render-time throw and shows it, instead of letting React unmount
 * the whole tree.
 *
 * Without one, any error thrown while rendering takes the entire page down to
 * a blank `<div id="root">` — header, tab strip and all — and the reader is
 * left with a white screen and no way back. That is a real risk here rather
 * than a theoretical one: most of what this app renders is scraped from
 * github.com and reshaped by parsers, so a field going missing upstream is a
 * question of when.
 *
 * A class is not a style choice. React exposes error boundaries only through
 * `getDerivedStateFromError` and `componentDidCatch`; there is no hook that
 * does this, so this is the one component in the tree that cannot be a
 * function.
 *
 * Placed around the view rather than around the app, so a broken tab keeps the
 * header and the tab strip alive and the reader can simply navigate away.
 *
 * Navigating away has to clear the error, or the fallback keeps rendering over
 * whatever the reader picks next and the tab strip appears to stop working —
 * which reads as a far worse bug than the original one. The caller does that by
 * giving this a `key` of the current route: a changed key remounts the
 * boundary, which drops the error with it. That is React's own idiom for
 * resetting one, and it beats clearing the state from `componentDidUpdate`,
 * which is an anti-pattern precisely because it re-renders to undo a render.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // A boundary that swallows an error and says nothing is worse than the
    // crash: it costs whoever debugs this the stack and the component trail.
    console.error('Render error caught by boundary:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <Notice
        icon={AlertCircle}
        title="This section could not be displayed"
        // The message, not the stack: it is often the useful half (a missing
        // field names itself) and the stack is already in the console.
        detail={error.message}
      >
        <Button size="sm" variant="secondary" onClick={() => this.setState({ error: null })}>
          Try again
        </Button>
      </Notice>
    )
  }
}
