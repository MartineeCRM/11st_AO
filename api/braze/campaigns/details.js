import { handleBrazeProxy } from '../../../server/brazeProxy.js'

export default function handler(req, res) {
  return handleBrazeProxy(req, res, '/campaigns/details', 'campaigns.details')
}
