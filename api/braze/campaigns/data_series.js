import { handleBrazeProxy } from '../../../server/brazeProxy.js'

export default function handler(req, res) {
  return handleBrazeProxy(req, res, '/campaigns/data_series', 'campaigns.data_series')
}
