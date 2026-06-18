import { handleBrazeProxy } from '../../../server/brazeProxy.js'

export default function handler(req, res) {
  return handleBrazeProxy(req, res, '/messages/scheduled_broadcasts', 'messages.schedule_broadcasts')
}
