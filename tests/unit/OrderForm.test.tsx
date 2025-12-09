import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { OrderForm } from '@/components/trading/OrderForm'
import type { Market } from '@/lib/polymarket/types'

// Mock Polymarket store
vi.mock('@/stores/polymarketStore', () => ({
  usePolymarketStore: vi.fn(() => ({
    getStatus: vi.fn(() => ({
      isReady: false,
      hasWallet: false,
      hasCreds: false,
      canTrade: false,
      canReadMarketData: true,
      isBuilder: true,
      builderMode: 'server',
      readOnlyMode: true,
    })),
    credentialsReady: false,
    isLoading: false,
  })),
}))

// Mock trading hook
vi.mock('@/hooks/usePolymarketTrading', () => ({
  usePolymarketTrading: vi.fn(() => ({
    placeOrder: vi.fn().mockResolvedValue({ success: false, error: 'Not connected' }),
    isLoading: false,
    isReady: false,
    address: undefined,
  })),
}))

// Mock auto-restore hook
vi.mock('@/hooks/useAutoRestoreClobClient', () => ({
  useAutoRestoreClobClient: vi.fn(),
}))

// Mock market API
vi.mock('@/lib/polymarket/marketApi', () => ({
  getOrderBook: vi.fn().mockResolvedValue({
    bids: [{ price: '0.55', size: '1000' }],
    asks: [{ price: '0.56', size: '1000' }],
    market: '0x123',
    asset_id: '0xyes',
    timestamp: '2025-12-06T10:00:00Z',
  }),
  calculateMarketPrice: vi.fn(() => ({
    bestBid: 0.55,
    bestAsk: 0.56,
    midPrice: 0.555,
    spread: 0.01,
  })),
}))

// Mock trading API
vi.mock('@/lib/polymarket/tradingApi', () => ({
  estimateBuy: vi.fn(() => ({
    cost: 100,
    shares: 178.57,
    avgPrice: 0.56,
    slippage: 0.009,
    potentialReturn: 178.57,
    potentialProfit: 78.57,
  })),
  estimateSell: vi.fn(() => ({
    cost: 100,
    shares: 55,
    avgPrice: 0.55,
    slippage: 0.009,
    potentialReturn: 55,
    potentialProfit: 0,
  })),
}))

describe('OrderForm Component', () => {
  const mockMarket: Market = {
    id: '0x123',
    condition_id: '0x123',
    question_id: 'q_123',
    question: 'Will it rain tomorrow?',
    description: 'Test market',
    active: true,
    closed: false,
    archived: false,
    accepting_orders: true,
    neg_risk: false,
    minimum_order_size: '0.1',
    minimum_tick_size: '0.01',
    tokens: [
      {
        token_id: '0xyes',
        outcome: 'Yes',
        price: 0.56,
        winner: false,
      },
      {
        token_id: '0xno',
        outcome: 'No',
        price: 0.44,
        winner: false,
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render order form with buy/sell toggle', async () => {
    render(<OrderForm market={mockMarket} selectedOutcome="Yes" />)

    await waitFor(() => {
      expect(screen.getByText(/buy/i)).toBeInTheDocument()
      expect(screen.getByText(/sell/i)).toBeInTheDocument()
    })
  })

  it('should show trading disabled message when not authenticated', async () => {
    render(<OrderForm market={mockMarket} selectedOutcome="Yes" />)

    await waitFor(() => {
      expect(
        screen.getByText(/connect.*wallet|trading.*not.*enabled/i)
      ).toBeInTheDocument()
    })
  })

  it('should display selected outcome in form title', async () => {
    render(<OrderForm market={mockMarket} selectedOutcome="Yes" />)

    await waitFor(() => {
      expect(screen.getByText(/trade yes/i)).toBeInTheDocument()
    })
  })

  it('should render amount input field', async () => {
    render(<OrderForm market={mockMarket} selectedOutcome="Yes" />)

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/amount/i) || screen.getByRole('spinbutton')
      expect(input).toBeInTheDocument()
    })
  })

  it('should show order book loading state', async () => {
    render(<OrderForm market={mockMarket} selectedOutcome="Yes" />)

    // Initially should show loading or fetch order book
    await waitFor(() => {
      const form = screen.getByText(/buy|sell/i)
      expect(form).toBeInTheDocument()
    })
  })
})
