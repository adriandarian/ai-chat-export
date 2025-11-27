import { describe, it, expect } from 'vitest'
import { render } from '../test/utils'
import App from './App'

describe('Popup App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })

  it('displays the app title or main content', () => {
    render(<App />)
    // The popup should have some meaningful content
    expect(document.body.textContent).toBeTruthy()
  })
})
