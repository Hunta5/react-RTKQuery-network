import { Provider as ReduxProvider } from 'react-redux'
import { initializeNetwork, store } from 'network/projectAdapter/initialize'

initializeNetwork()

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  return <ReduxProvider store={store}>{children}</ReduxProvider>
}
