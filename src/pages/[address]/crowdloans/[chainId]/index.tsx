import CrowdloanPage from '../../../../components/main/CrowdloanPage'

import { getInitialPropsWithRedux } from 'src/rtk/app/nextHelpers'
import { fetchData, fetchDataByAccount } from '../../../../rtk/app/util'
import { parseAddressFromUrl } from '../../../../components/utils/index'

getInitialPropsWithRedux(CrowdloanPage, async ({ dispatch, context }) => {
  const { address } = context.query

  const accounts = parseAddressFromUrl(address)

  fetchData(dispatch)

  if (accounts) {
    await fetchDataByAccount(dispatch, accounts, false, true)
  }

  return {}
})

export default CrowdloanPage