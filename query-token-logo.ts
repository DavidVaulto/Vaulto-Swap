/**
 * Query Uniswap GraphQL API to find token logo URLs
 * 
 * Usage:
 *   npx tsx query-token-logo.ts <tokenAddress> [chain]
 * 
 * Examples:
 *   npx tsx query-token-logo.ts 0x14c3abF95Cb9C93a8b82C1CdCB76D72Cb87b2d4c ETHEREUM
 *   npx tsx query-token-logo.ts 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 ETHEREUM
 */

const GRAPHQL_ENDPOINT = 'https://interface.gateway.uniswap.org/v1/graphql'

interface TokenProject {
  id: string
  name: string | null
  logoUrl: string | null
}

interface Token {
  id: string
  address: string
  symbol: string | null
  name: string | null
  chain: string
  decimals: number | null
  project: TokenProject | null
}

interface GraphQLResponse {
  data?: {
    token: Token | null
  }
  errors?: Array<{
    message: string
    extensions?: {
      code?: string
    }
  }>
}

const TOKEN_QUERY = `
  query TokenWeb($chain: Chain!, $address: String = null) {
    token(chain: $chain, address: $address) {
      id
      address
      symbol
      name
      chain
      decimals
      project {
        id
        name
        logoUrl
      }
    }
  }
`

/**
 * Query the GraphQL API for token information
 */
async function queryToken(tokenAddress: string, chain: string = 'ETHEREUM'): Promise<Token | null> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://app.uniswap.org',
      'Referer': 'https://app.uniswap.org/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({
      query: TOKEN_QUERY,
      variables: {
        chain: chain.toUpperCase(),
        address: tokenAddress,
      },
    }),
  })

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`
    try {
      const errorBody = await response.text()
      if (errorBody) {
        errorMessage += ` - ${errorBody}`
      }
    } catch (e) {
      // Ignore errors reading error body
    }
    throw new Error(errorMessage)
  }

  const result: GraphQLResponse = await response.json()

  if (result.errors) {
    const errorMessages = result.errors.map((e) => e.message).join(', ')
    throw new Error(`GraphQL errors: ${errorMessages}`)
  }

  return result.data?.token || null
}

/**
 * Verify if a URL is accessible
 */
async function verifyUrlExists(url: string): Promise<{ exists: boolean; status?: number; contentType?: string }> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return {
      exists: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type') || undefined,
    }
  } catch (error) {
    return {
      exists: false,
    }
  }
}

/**
 * Get token logo URL with verification
 */
async function getTokenLogoUrl(
  tokenAddress: string,
  chain: string = 'ETHEREUM'
): Promise<{
  logoUrl: string | null
  verified: boolean
  tokenInfo: Token | null
  source: 'graphql' | 'not-found'
}> {
  try {
    const token = await queryToken(tokenAddress, chain)

    if (!token) {
      return {
        logoUrl: null,
        verified: false,
        tokenInfo: null,
        source: 'not-found',
      }
    }

    const logoUrl = token.project?.logoUrl || null

    if (!logoUrl) {
      return {
        logoUrl: null,
        verified: false,
        tokenInfo: token,
        source: 'graphql',
      }
    }

    // Verify the logo URL is accessible
    const verification = await verifyUrlExists(logoUrl)

    return {
      logoUrl,
      verified: verification.exists,
      tokenInfo: token,
      source: 'graphql',
    }
  } catch (error) {
    throw error
  }
}

/**
 * Main function to run the query
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: npx tsx query-token-logo.ts <tokenAddress> [chain]')
    console.log('\nExamples:')
    console.log('  npx tsx query-token-logo.ts 0x14c3abF95Cb9C93a8b82C1CdCB76D72Cb87b2d4c ETHEREUM')
    console.log('  npx tsx query-token-logo.ts 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 ETHEREUM')
    process.exit(1)
  }

  const tokenAddress = args[0]
  const chain = args[1] || 'ETHEREUM'

  console.log('='.repeat(80))
  console.log('TOKEN LOGO URL QUERY')
  console.log('='.repeat(80))
  console.log(`\nToken Address: ${tokenAddress}`)
  console.log(`Chain: ${chain.toUpperCase()}`)
  console.log(`GraphQL Endpoint: ${GRAPHQL_ENDPOINT}\n`)

  try {
    const result = await getTokenLogoUrl(tokenAddress, chain)

    console.log('='.repeat(80))
    console.log('RESULTS')
    console.log('='.repeat(80))

    if (!result.tokenInfo) {
      console.log('\n❌ Token not found in GraphQL API')
      process.exit(1)
    }

    console.log('\n--- Token Information ---')
    console.log(`   ID: ${result.tokenInfo.id}`)
    console.log(`   Address: ${result.tokenInfo.address}`)
    console.log(`   Symbol: ${result.tokenInfo.symbol || 'N/A'}`)
    console.log(`   Name: ${result.tokenInfo.name || 'N/A'}`)
    console.log(`   Chain: ${result.tokenInfo.chain}`)
    console.log(`   Decimals: ${result.tokenInfo.decimals ?? 'N/A'}`)

    if (result.tokenInfo.project) {
      console.log('\n--- Project Information ---')
      console.log(`   Project ID: ${result.tokenInfo.project.id}`)
      console.log(`   Project Name: ${result.tokenInfo.project.name || 'N/A'}`)
    }

    console.log('\n--- Logo URL ---')
    if (result.logoUrl) {
      console.log(`   ✅ Logo URL Found: ${result.logoUrl}`)
      console.log(`   Verified: ${result.verified ? '✅ Accessible' : '❌ Not accessible'}`)
      console.log(`   Source: ${result.source}`)
    } else {
      console.log(`   ❌ No logo URL found`)
      console.log(`   Source: ${result.source}`)
    }

    console.log('\n' + '='.repeat(80))
    console.log('SUMMARY')
    console.log('='.repeat(80))
    console.log(`\nToken: ${result.tokenInfo.symbol || 'N/A'} (${result.tokenInfo.name || 'N/A'})`)
    console.log(`Address: ${result.tokenInfo.address}`)

    if (result.logoUrl) {
      console.log(`\n✅ Logo URL: ${result.logoUrl}`)
      if (result.verified) {
        console.log('   Status: Accessible and verified')
      } else {
        console.log('   Status: URL found but not accessible')
      }
    } else {
      console.log(`\n❌ No logo URL available`)
    }

    console.log('\n' + '='.repeat(80))
  } catch (error) {
    console.error('\n❌ Error querying GraphQL API:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    } else {
      console.error(`   ${String(error)}`)
    }
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

// Export functions for use in other modules
export { queryToken, getTokenLogoUrl, verifyUrlExists, GRAPHQL_ENDPOINT }

