import { AppstoreOutlined, DownOutlined, MenuOutlined, LineChartOutlined, UpOutlined } from '@ant-design/icons'
import { isEmptyArray, isDef } from '@subsocial/utils'
import { Skeleton, Table, Tooltip, Tabs } from 'antd'
import { CSSProperties, useEffect } from 'react'
import store from 'store'
import { useResponsiveSize } from '../responsive/ResponsiveContext'
import NoData from '../utils/EmptyList'
import { getIconUrl, Loading, toShortAddress } from '../utils/index'
import { MutedDiv } from '../utils/MutedText'
import { BalanceCards } from './BalanceCards'
import { BalancesChart, toShortMoney } from './BalancesBarChart'
import styles from './Table.module.sass'
import { BalanceKind, TableView, TableViewOption, TableInfo } from './types'
import BN from 'bignumber.js'
import { BalanceView, BN_TEN, CopyAddress } from '../homePage/address-views/utils/index'
import Avatar from 'antd/lib/avatar/avatar'
import { AvatarSize } from 'antd/lib/avatar/SizeContext'
import { BareProps } from '../utils/Section'
import { ExternalLink } from '../identity/utils'
import clsx from 'clsx'
import { resolveSubscanUrl, resolveStatescanAssetUrl } from './links'
import { AddressQrModal } from '../qrs/QrModal'
import { isFunction } from 'lodash'
import { CrowdloanStatus } from '../../types'
import { RelayChain } from '../../types/index'
import { BalanceEntityRecord } from '../../rtk/features/balances/balancesSlice'
import { ContributionsRecord } from '../../rtk/features/contributions/contributionsSlice'
import { AssetsBalancesRecord } from '../../rtk/features/assetsBalances/assetsBalancesSlice'
import { ChainInfo } from '../../rtk/features/multiChainInfo/types'
import { NftsEntitiesRecord } from '../../rtk/features/nfts/nftsSlice'
import BaseAvatar from '../utils/DfAvatar'
import Name from '../homePage/address-views/Name'
import { toGenericAccountId } from '../../rtk/app/util'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { StakingCandidateInfoRecord } from '../../rtk/features/stakingCandidates/utils'
import { useIdentities, getSubsocialIdentity } from '../../rtk/features/identities/identitiesHooks'
import { BIGNUMBER_ZERO } from '../../config/app/consts'

export const BALANCE_TABLE_VIEW = 'BalanceTableView'
export const CROWDLOAN_TABLE_VIEW = 'CrowdloanTableView'
export const ASSETS_TABLE_VIEW = 'AssetsTableView'
export const BALANCE_SHOW_ZERO_BALANCES = 'BalanceShowZeroBalances'
export const CROWDLOAN_SHOW_ZERO_BALANCES = 'CrowdloanShowZeroBalances'
export const ASSETS_SHOW_ZERO_BALANCES = 'AssetsShowZeroBalances'

const { TabPane } = Tabs

export type TableKind = 'balances' | 'crowdloans' | 'assets'

export const relayChains: RelayChain[] = [ 'kusama', 'polkadot' ]

export const disableContributionButton = [
  'acala'
]

export const tailsViewOpt: TableViewOption[] = [
  { label: <MenuOutlined />, value: 'table' },
  { label: <AppstoreOutlined />, value: 'cards' },
  { label: <LineChartOutlined />, value: 'pie' },
]

export type BalancePartType<T> = {
  maxItems?: number
  balanceKind: BalanceKind
  data?: T[]
  columns: any
  skeleton?: T[]
  filterItem?: (item: T) => boolean
  tableView: TableView
  loadingLabel: string
  showZeroBalances: boolean
  showCheckBox?: boolean
  loading: boolean
  storeTableView: string
  storeShowZeroBalance: string
  noData: string
  relayChain?: RelayChain
}

export const fieldSkeleton = <Skeleton active title={false} paragraph={{ rows: 1 }} className={styles.Skeleton} />

type TableTabsProps<T> = {
  data: Record<string, T[]>
  tabs: any[]
  tabKey: string
  setTabKey: (value: any) => void
  className?: string
}

export const TableTabsTabs = <T extends TableInfo>({ data, tabKey, tabs, setTabKey, className }: TableTabsProps<T>) => (
  <Tabs className={clsx(styles.AssetsTabs, className)} onChange={(value) => setTabKey(value)} activeKey={tabKey}>
    {tabs.map(({ key, label }) => (
      <TabPane
        key={key}
        tab={
          <div className='d-flex'>{label} <MutedDiv className='ml-2'>{data[key].length}</MutedDiv></div>
        }
      />
    ))}
  </Tabs>
)

export type InnerBalancesTableProps<T> = {
  tableData: T[]
  columns: any
  loading: boolean
  noData: string
}

export const InnerBalancesTable = <T extends TableInfo>({
  tableData,
  columns,
  loading,
  noData,
}: InnerBalancesTableProps<T>) => (
  <div className={styles.BalanceBlock}>
    {isEmptyArray(tableData)
      ? <NoData description={noData} />
      : <Table
        key='balance-table'
        style={{ marginBottom: 1 }}
        columns={columns}
        dataSource={tableData}
        pagination={false}
        expandable={{
          rowExpandable: record => !!record.children,
          expandIconColumnIndex: 1,
          expandRowByClick: true,
          expandIcon: ({ expanded, record }) => {
            if (loading || !record.children) return <></>

            const icon = expanded ? <UpOutlined /> : <DownOutlined />
            return <MutedDiv className={styles.ExpandIcon}>{icon}</MutedDiv>
          },
          onExpand: (expanded, record) => {
            return record.children && (!expanded ?
              record.balance = <>{record.balanceView}</> :
              record.balance = <div className='mr-4'>{record.balanceWithoutChildren}</div>
            )
          }
        }}
      />
    }
  </div>
)

type LinkWithIconProps = {
  title?: string
  withCircle?: boolean
  link: string
  icon: React.ReactNode
  className?: string
  label?: string
}

export const LinkWithIcon = ({ link, title, icon, className, withCircle = true, label }: LinkWithIconProps) => {
  const linkLabel = <div className='d-flex align-items-center'>
    <div className={clsx({ [styles.SubscanLink]: withCircle, ['mr-2']: label }, 'text-center LinkWithIcon')}>
      {typeof icon === 'string' ? <img className={clsx('d-block')} src={icon} /> : icon}
    </div>
    {label && label}
  </div>
  
  const linkItem = <ExternalLink url={link} className={`d-block ${className}`} value={linkLabel} />

  return title ? <Tooltip title={title}>
    {linkItem}
  </Tooltip> : linkItem
}

type SubscanLinkProps = {
  address: string
  network: string
}

export const SubscanLink = ({ network, address }: SubscanLinkProps) => {
  const link = resolveSubscanUrl(network, address)
  const { t } = useTranslation()

  if (!link) return <></>

  return <LinkWithIcon
    link={link}
    icon='/images/subscan.svg'
    title={t('buttons.viewAddressOn', { website: 'Subscan.io' })}
  />
}

type StatescanAassetLinkProps = {
  assetId: number
}

export const StatescanAssetLink = ({ assetId }: StatescanAassetLinkProps) => {
  const link = resolveStatescanAssetUrl(assetId)
  const { t } = useTranslation()
  if (!link) return <></>

  return <LinkWithIcon
    link={link}
    className={styles.StatescanAssetLink}
    withCircle={false}
    title={t('buttons.viewAddressOn', { website: 'Statescan.io' })}
    icon='/images/statescan.svg'
  />
}

type TableLoadingProps = {
  loadingLabel: string
}

export const TableLoading = ({ loadingLabel }: TableLoadingProps) => (
  <div className={clsx(styles.BalanceBlock, styles.TableLoading)}>
    <Loading label={loadingLabel} />
  </div>
)

export const BalancePart = <T extends TableInfo>({
  balanceKind,
  maxItems,
  data,
  columns,
  skeleton,
  filterItem,
  tableView,
  showZeroBalances,
  loadingLabel,
  loading,
  storeTableView,
  storeShowZeroBalance,
  showCheckBox,
  noData,
  relayChain,
}: BalancePartType<T>) => {

  const { isMobile } = useResponsiveSize()

  useEffect(() => {
    store.set(storeTableView, tableView)
  }, [ tableView ])

  useEffect(() => {
    store.set(storeShowZeroBalance, showZeroBalances)
  }, [ showZeroBalances ])

  if (!data || !skeleton) return <Loading />

  let tableData = skeleton

  if (!loading) {
    const filterNonZero = (x: T) => !showZeroBalances && showCheckBox ? x.balanceValue.gt(0) : true

    const filter = (x: T) => isFunction(filterItem)
      ? filterItem(x) || filterNonZero(x)
      : filterNonZero(x)

    tableData = data.slice(0, maxItems).filter(filter)
  }

  if (isEmptyArray(tableData) && loading) return <TableLoading loadingLabel={loadingLabel} />

  switch (tableView) {
    case 'table': return <InnerBalancesTable loading={loading} columns={columns} tableData={tableData} noData={noData} />
    case 'pie': return <BalancesChart loading={loading} balanceKind={balanceKind} tableData={tableData} noData={noData} relayChain={relayChain} />
    default: return <BalanceCards data={tableData || []} balanceKind={balanceKind} isMobile={isMobile} noData={noData} />
  }
}

export const getTotalBalance = (balance: BN, price: string) => (
  balance && price
    ? balance.multipliedBy(new BN(price))
    : BIGNUMBER_ZERO
)

type ChainProps = {
  accountId?: string
  icon: string
  name?: string
  isShortAddress?: boolean
  withCopy?: boolean
  avatarSize?: AvatarSize
  halfLength?: number
  isMonosizedFont?: boolean
  withQr?: boolean
}

type AvatarOrSkeletonProps = BareProps & {
  icon: string
  size?: AvatarSize
  externalIcon?: boolean
}

export const AvatarOrSkeleton = ({ size, icon, className, externalIcon = false }: AvatarOrSkeletonProps) => {
  if (icon) {
    const imgUrl = externalIcon ? icon : getIconUrl(icon)

    return <Avatar src={imgUrl} size={size} className={className} />
  } else {
    return <Skeleton.Avatar size={size as number} shape='circle' className={className} />
  }
}

export const ChainData = ({
  accountId,
  icon,
  name,
  isShortAddress = false,
  avatarSize = 'large',
  withCopy = true,
  halfLength = 6,
  isMonosizedFont = true,
  withQr = true
}: ChainProps) => {
  const { isMobile } = useResponsiveSize()

  const address = accountId ? <Address
    name={name || accountId}
    accountId={accountId}
    isShortAddress={isShortAddress}
    halfLength={halfLength}
    withCopy={withCopy}
    isMonosizedFont={isMonosizedFont}
    withQr={withQr}
  /> : null

  return (
    <div className={clsx({ ['d-flex']: !isMobile }, 'align-items-center')}>
      <div className='d-flex align-items-center'>
        <AvatarOrSkeleton icon={icon} size={avatarSize} className='mr-2 align-items-start flex-shrink-none' />
        <div>
          {name && <div className='font-weight-bold FontNormal'>{name}</div>}
          {(!isMobile || avatarSize === 'large') && address}
        </div>
      </div>
      {(isMobile && avatarSize !== 'large') && <div className={styles.CardAddressMargin}>{address}</div>}
    </div>
  )
}

const maxPreviewSymbols = 3
const maxTokenCharacters = maxPreviewSymbols * 6

export const otherBalances = (tokenSymbols: string[]) => {
  const slicedTokenSymbols = tokenSymbols.slice(0, maxPreviewSymbols)
  let tokenSymbolsString = tokenSymbols[0]
  let usedSymbols = slicedTokenSymbols.length
  for (let i = 1; i < slicedTokenSymbols.length; i++) {
    const tokenSymbol = slicedTokenSymbols[i]
    if (tokenSymbolsString.length + tokenSymbol.length < maxTokenCharacters) {
      tokenSymbolsString += ', ' + tokenSymbol
    } else {
      usedSymbols = i
      break
    }
  }
  let msg = `+ ${tokenSymbolsString}`

  if (tokenSymbols.length > usedSymbols) {
    if (usedSymbols > 1) msg += ','
    msg += ' and more'
  }

  return msg
}

export const getDecimalsAndSymbol = (chainInfo: ChainInfo, symbol?: string) => {
  const { tokenSymbols = [], tokenDecimals = [], assetsRegistry } = chainInfo || {}

  const tokenIndex = tokenSymbols.findIndex(x => x === symbol)

  const tokenDecimalsByTokenIndex = tokenIndex < 0 ? undefined : tokenDecimals[tokenIndex]

  const decimals: number = tokenDecimalsByTokenIndex || assetsRegistry?.[symbol || '']?.decimals

  return { decimal: decimals, symbol: symbol }
}

export const getPrice = (tokenPrices: any[] | undefined, priceField: string, comparableValue: string) => {
  const stable = comparableValue?.toLowerCase().includes('usd') ? 1 : 0
  const priceValue = (tokenPrices?.find(x => x[priceField] === comparableValue?.toLowerCase())?.current_price)?.toString() || stable

  return priceValue
}

type BalanceType = {
  balanceValue: BN
  priceValue: string
  symbol: string
  balanceClassName?: string
  t: TFunction
}

export const getBalances = ({ balanceValue, priceValue, symbol, t }: BalanceType) => {
  const balance = <BalanceView value={balanceValue.toString()} symbol={symbol} />

  const price = <BalanceView value={priceValue} symbol='$' startWithSymbol />

  const totalValue = getTotalBalance(balanceValue, priceValue)
  const total = <BalanceView value={priceValue ? totalValue : '0'} symbol='$' startWithSymbol />

  return {
    balance,
    price: priceValue ? price : <div className='DfGrey'>{t('general.notListed')}</div>,
    total,
    totalValue
  }
}

type BalanceWithDecimalsProps = {
  totalBalance: string
  decimals: number
}

export const getBalanceWithDecimals = ({ totalBalance, decimals }: BalanceWithDecimalsProps): BN => {
  return new BN(totalBalance).div(BN_TEN.pow(decimals))
}

type LabelAndDescriptionProps = {
  label: React.ReactNode
  desc: React.ReactNode
}

export const LabelAndDescription = ({ label, desc }: LabelAndDescriptionProps) => (
  <div>
    <div>{label}</div>
    <MutedDiv className={styles.FontSmall}>{desc}</MutedDiv>
  </div>
)

export const getCrowdloanStatus = (isCapped: boolean, isWinner: boolean, isEnded: boolean): CrowdloanStatus => {
  if (isWinner) return 'Winner'
  else if (isEnded || isCapped) return 'Ended'
  else return 'Active'
}

type LabelWithShortMoneyFormatProps = {
  value: BN
  symbol: string
  noFractionForZero?: boolean
  className?: string
  style?: CSSProperties
}

export const LabelWithShortMoneyFormat = ({ className, style, value, symbol, noFractionForZero }: LabelWithShortMoneyFormatProps) => (
  <BalanceView style={style} className={className} value={toShortMoney({ num: value.toNumber(), noFractionForZero })} symbol={symbol} defaultPostfix={noFractionForZero ? '' : undefined} />
)

type EntitiesRecord = BalanceEntityRecord | ContributionsRecord | AssetsBalancesRecord | NftsEntitiesRecord | StakingCandidateInfoRecord

export const isDataLoading = <T extends EntitiesRecord>(data?: T) => {
  if (!data) return

  const dataValues = Object.values(data)

  let isLoading = false

  for (let item of dataValues) {
    const { loading } = item
    if (loading) {
      isLoading = loading
      break
    }
  }

  return isLoading
}

type AddressProps = {
  name?: string
  accountId: string
  withCopy?: boolean
  isShortAddress?: boolean
  halfLength?: number
  withQr?: boolean
  isMonosizedFont?: boolean
}

export const Address = ({
  name,
  accountId,
  withCopy = true,
  isShortAddress = true,
  halfLength = 6,
  withQr = true,
  isMonosizedFont = false
}: AddressProps) => (
  <div className='d-flex align-items-center'>
    {withCopy ? <CopyAddress
      message={`${name} address copied`}
      className={clsx({ ['MonosizedFont']: isMonosizedFont }, 'mr-2')}
      address={accountId}
      iconVisibility
    >
      {isShortAddress ? toShortAddress(accountId, halfLength) : accountId}
    </CopyAddress> : <MutedDiv>{isShortAddress ? toShortAddress(accountId, halfLength) : accountId}</MutedDiv>}
    {withQr && <AddressQrModal className='grey-light' address={accountId} network={name} />}
  </div>
)

type AccountPreviewProps = {
  name?: string
  account: string
  avatar?: string
  className?: string
  withQr?: boolean
  withCopy?: boolean
  halfLength?: number
  isMonosizedFont?: boolean
  withName?: boolean
  withAddress?: boolean
  largeAvatar?: boolean
}

export const AccountPreview = ({
  name,
  account,
  avatar,
  className,
  withQr,
  withCopy,
  halfLength,
  isMonosizedFont = true,
  withName = true,
  withAddress = true,
  largeAvatar = false
}: AccountPreviewProps) => {
  const identities = useIdentities(account)

  const address = <Address
    name={name}
    accountId={account}
    isMonosizedFont={isMonosizedFont}
    withQr={withQr}
    withCopy={withCopy}
    halfLength={halfLength}
  />

  const accountName = <Name identities={identities} address={toGenericAccountId(account)} />
  const subsocialAvatar = getSubsocialIdentity(identities)?.image

  return <div>
    <div className={clsx(clsx('d-flex', { ['align-items-center']: largeAvatar }), className)}>
      <BaseAvatar size={largeAvatar ? 36 : 24} address={account} avatar={avatar ? avatar : subsocialAvatar} />
      <div>
        <div className={clsx({ ['font-weight-bold']: withName })}>
          {withName && accountName}
        </div>
        {withAddress && <div>{address}</div>}
      </div>
    </div>
  </div>
}

export const getParentBalances = <T extends TableInfo>(balances: T[], nativeSymbol: string) => {
  let balanceValueBN = BIGNUMBER_ZERO
  let totalValueBN = BIGNUMBER_ZERO
  let priceValue

  balances.filter(isDef).forEach(({ balanceValue, totalValue, totalTokensValue, price }) => {
    balanceValueBN = balanceValueBN.plus(balanceValue)
    totalValueBN = totalValueBN.plus(totalTokensValue || totalValue)
    priceValue = price
  })

  const balance = <BalanceView value={balanceValueBN.toString()} symbol={nativeSymbol} />
  const total = <BalanceView value={totalValueBN.toString()} symbol='$' startWithSymbol />

  return {
    balanceValueBN,
    totalValueBN,
    priceValue,
    balance,
    total
  }
}

export const resolveAccountDataImage = (key: string) => `/images/${key}.svg`