import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMarkets, getMarket, getOrderBook } from '@/lib/polymarket/marketApi'

describe('Market API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMarkets', () => {
    it('should fetch all markets successfully', async () => {
      const mockMarkets = [
        {
          condition_id: '0x123',
          question: 'Will it rain tomorrow?',
          active: true,
          closed: false,
        },
        {
          condition_id: '0x456',
          question: 'Will the price go up?',
          active: true,
          closed: false,
        },
      ]

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: mockMarkets,
          next_cursor: 'abc123',
        }),
      }) as any

      const result = await getMarkets({ limit: 20 })

      expect(result.data).toHaveLength(2)
      expect(result.next_cursor).toBe('abc123')
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/markets')
      )
    })

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }) as any

      await expect(getMarkets()).rejects.toThrow('Failed to fetch markets')
    })
  })

  describe('getMarket', () => {
    it('should fetch single market by condition ID', async () => {
      const mockMarket = {
        condition_id: '0x123',
        question: 'Will it rain tomorrow?',
        active: true,
        closed: false,
        tokens: [
          { token_id: '0xyes', outcome: 'Yes' },
          { token_id: '0xno', outcome: 'No' },
        ],
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMarket,
      }) as any

      const market = await getMarket('0x123')

      expect(market).toEqual(mockMarket)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/markets/0x123')
      )
    })

    it('should return null for 404 errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }) as any

      const market = await getMarket('0xnonexistent')
      expect(market).toBeNull()
    })
  })

  describe('getOrderBook', () => {
    it('should fetch order book for token ID', async () => {
      const mockOrderBook = {
        bids: [
          { price: '0.55', size: '100' },
          { price: '0.54', size: '200' },
        ],
        asks: [
          { price: '0.56', size: '150' },
          { price: '0.57', size: '250' },
        ],
        market: '0x123',
        asset_id: '0xtoken',
        timestamp: '2025-12-06T10:00:00Z',
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockOrderBook,
      }) as any

      const orderBook = await getOrderBook('0xtoken')

      expect(orderBook).toEqual(mockOrderBook)
      expect(orderBook.bids).toHaveLength(2)
      expect(orderBook.asks).toHaveLength(2)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/book?token_id=0xtoken')
      )
    })

    it('should handle order book fetch errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }) as any

      await expect(getOrderBook('0xtoken')).rejects.toThrow('Failed to fetch order book')
    })
  })
})
