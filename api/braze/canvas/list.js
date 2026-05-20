import { handleBrazeProxy } from '../../../server/brazeProxy.js'

export default function handler(req, res) {
  return handleBrazeProxy(req, res, '/canvas/list', 'canvas.list')
}
