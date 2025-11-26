/**
 * Example Test: Finding Logo URL for Token
 * Token Address: 0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8
 * 
 * This script demonstrates the step-by-step process of finding a token logo URL
 * following Uniswap's implementation pattern.
 */

import { getAddress } from 'ethers'

// Step 1: Define the token address and chain
const TOKEN_ADDRESS = '0x0d54D4279B9E8c54cD8547c2C75A8Ee81A0BcaE8'
const CHAIN_ID = 1 // Ethereum Mainnet (assuming, since address format is EVM)

// Step 2: Network name mapping
const CHAIN_NETWORK_NAMES: Record<number, string> = {
  1: 'ethereum',
  137: 'polygon',
  42161: 'arbitrum',
  10: 'optimism',
  8453: 'base',
  42220: 'celo',
  56: 'bsc',
  43114: 'avalanche',
  81457: 'blast',
  7777777: 'zora',
  324: 'zksync',
}

// Step 3: Checksum the address (EIP-55)
function checksumAddress(address: string): string {
  try {
    return getAddress(address) // Automatically checksums the address
  } catch (error) {
    throw new Error(`Invalid address: ${address}`)
  }
}

// Step 4: Construct fallback logo URL
function constructLogoUrl(chainId: number, address: string): string {
  const networkName = CHAIN_NETWORK_NAMES[chainId] || 'ethereum'
  const checksummedAddress = checksumAddress(address)
  
  return `https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/${networkName}/assets/${checksummedAddress}/logo.png`
}

// Step 5: Simulate GraphQL query (mock)
interface MockGraphQLResponse {
  token: {
    project: {
      logoUrl?: string | null
    }
  } | null
}

async function mockGraphQLQuery(chainId: number, address: string): Promise<MockGraphQLResponse> {
  // In real implementation, this would be:
  // const { data } = await apolloClient.query({ query: TOKEN_QUERY, variables: { chain: 'ETHEREUM', address } })
  
  // Mock response - GraphQL API might return null or a logoUrl
  return {
    token: {
      project: {
        logoUrl: null, // Simulating no logoUrl from GraphQL (will use fallback)
      },
    },
  }
}

// Step 6: Main function to get logo URL with fallback
async function getTokenLogoUrl(chainId: number, address: string): Promise<string | null> {
  console.log('='.repeat(80))
  console.log('TOKEN LOGO URL LOOKUP PROCESS')
  console.log('='.repeat(80))
  console.log(`\nToken Address: ${address}`)
  console.log(`Chain ID: ${chainId}`)
  console.log(`Network: ${CHAIN_NETWORK_NAMES[chainId] || 'ethereum'}`)
  
  // Step 6a: Try GraphQL API first
  console.log('\n--- Step 1: Querying GraphQL API ---')
  const graphQLResponse = await mockGraphQLQuery(chainId, address)
  
  if (graphQLResponse.token?.project?.logoUrl) {
    console.log(`✅ Found logo URL from GraphQL: ${graphQLResponse.token.project.logoUrl}`)
    return graphQLResponse.token.project.logoUrl
  }
  console.log('❌ No logo URL from GraphQL API (using fallback)')
  
  // Step 6b: Construct fallback URL
  console.log('\n--- Step 2: Constructing Fallback URL ---')
  console.log(`Original Address: ${address}`)
  
  const checksummed = checksumAddress(address)
  console.log(`Checksummed Address: ${checksummed}`)
  
  const fallbackUrl = constructLogoUrl(chainId, address)
  console.log(`✅ Constructed Fallback URL: ${fallbackUrl}`)
  
  // Step 6c: Verify URL format
  console.log('\n--- Step 3: URL Format Verification ---')
  console.log(`URL Pattern: https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/{network}/assets/{address}/logo.png`)
  console.log(`Network Name: ${CHAIN_NETWORK_NAMES[chainId]}`)
  console.log(`Address: ${checksummed}`)
  console.log(`Final URL: ${fallbackUrl}`)
  
  return fallbackUrl
}

// Step 7: Test the process
async function runTest() {
  try {
    console.log('\n🚀 Starting Token Logo URL Lookup Test\n')
    
    const logoUrl = await getTokenLogoUrl(CHAIN_ID, TOKEN_ADDRESS)
    
    console.log('\n' + '='.repeat(80))
    console.log('RESULT')
    console.log('='.repeat(80))
    console.log(`\n✅ Final Logo URL: ${logoUrl}`)
    console.log(`\n📋 Summary:`)
    console.log(`   - Token Address: ${TOKEN_ADDRESS}`)
    console.log(`   - Chain ID: ${CHAIN_ID} (${CHAIN_NETWORK_NAMES[CHAIN_ID]})`)
    console.log(`   - Checksummed Address: ${checksumAddress(TOKEN_ADDRESS)}`)
    console.log(`   - Logo URL: ${logoUrl}`)
    console.log(`\n🔍 To verify, check: ${logoUrl}`)
    console.log('\n' + '='.repeat(80))
    
    return logoUrl
  } catch (error) {
    console.error('\n❌ Error:', error)
    throw error
  }
}

// Export for use in other files
export { getTokenLogoUrl, checksumAddress, constructLogoUrl, CHAIN_NETWORK_NAMES }

// Run if executed directly
if (require.main === module) {
  runTest()
    .then(() => {
      console.log('\n✅ Test completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error)
      process.exit(1)
    })
}

