import { handleBrazeProxy } from '../../../server/brazeProxy.js'

export default function handler(req, res) {
  return handleBrazeProxy(req, res, '/campaigns/list', 'campaigns.list')
}
