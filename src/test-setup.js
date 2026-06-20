import '@testing-library/jest-dom'
import { configureCopilotCliPath } from './copilotCliPath'

configureCopilotCliPath()

// jsdom does not implement scrollIntoView — guard for Node env
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = () => {}
}
