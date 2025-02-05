"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowUp, ArrowDown, ExternalLink } from "lucide-react"
import Image from "next/image"

interface Token {
  name: string
  marketCap: number // in SOL
  symbol: string
  address: string
  initialMC: number
  currentMC: number
  buyTime: Date
  buyAmount: number // in SOL
  hasTwitter: boolean
  hasTelegram: boolean
  hasWebsite: boolean
}

interface Trade {
  name: string
  buyMC: number // in SOL
  sellMC: number // in SOL
  buyAmount: number // in SOL
  txLink: string
  result: "WIN" | "SL"
  profit: number // in SOL
}

export default function TradingBot() {
  const [wallet, setWallet] = useState<string | null>(null)
  const [isTrading, setIsTrading] = useState(false)
  const [tradingParams, setTradingParams] = useState({
    buyAmount: 1, // in SOL, default to 1
    maxTrade: 2, // number of trades
    buyMC: 50, // in SOL
    sellMC: 10, // in SOL (added to initial MC)
    stopLoss: 2, // in SOL (subtracted from initial MC)
    slippage: 0,
  })
  const [socialChecks, setSocialChecks] = useState({
    twitter: false,
    telegram: false,
    website: false,
  })
  const [tradeStats, setTradeStats] = useState({
    wins: 0,
    losses: 0,
    totalProfit: 0, // in SOL
  })
  const [newTokens, setNewTokens] = useState<Token[]>([])
  const [selectedTokens, setSelectedTokens] = useState<Token[]>([])
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [transactionsPerPage] = useState(10)

  const connectWallet = async () => {
    try {
      const { solana } = window as any
      if (!solana?.isPhantom) {
        alert("Please install Phantom wallet")
        return
      }
      const response = await solana.connect()
      setWallet(response.publicKey.toString())
    } catch (error) {
      console.error("Wallet connection error:", error)
    }
  }

  const checkAndExecuteTrades = useCallback(() => {
    selectedTokens.forEach((token) => {
      if (token.currentMC >= token.initialMC + tradingParams.sellMC) {
        executeSell(token, "WIN")
      } else if (token.currentMC <= token.initialMC - tradingParams.stopLoss) {
        executeSell(token, "SL")
      }
    })
  }, [selectedTokens, tradingParams.sellMC, tradingParams.stopLoss])

  const executeSell = (token: Token, result: "WIN" | "SL") => {
    const soldAmount = (token.buyAmount / token.initialMC) * token.currentMC
    const profit = soldAmount - token.buyAmount
    const trade: Trade = {
      name: token.name,
      buyMC: token.initialMC,
      sellMC: token.currentMC,
      buyAmount: token.buyAmount,
      txLink: `https://solscan.io/tx/${Math.random().toString(36).substring(2, 15)}`,
      result: result,
      profit: profit,
    }

    setTradeHistory((prev) => [trade, ...prev])
    setSelectedTokens((prev) => prev.filter((t) => t.address !== token.address))
    updateTradeStats(trade)
  }

  const updateTradeStats = (trade: Trade) => {
    setTradeStats((prev) => ({
      wins: trade.result === "WIN" ? prev.wins + 1 : prev.wins,
      losses: trade.result === "SL" ? prev.losses + 1 : prev.losses,
      totalProfit: prev.totalProfit + trade.profit,
    }))
  }

  const selectNewToken = useCallback(() => {
    if (selectedTokens.length < tradingParams.maxTrade) {
      const eligibleTokens = newTokens.filter(
        (token) =>
          token.marketCap >= tradingParams.buyMC &&
          !selectedTokens.some((selected) => selected.address === token.address) &&
          (!socialChecks.twitter || token.hasTwitter) &&
          (!socialChecks.telegram || token.hasTelegram) &&
          (!socialChecks.website || token.hasWebsite),
      )

      if (eligibleTokens.length > 0) {
        const newSelectedToken = eligibleTokens[0]
        setSelectedTokens((prev) => [
          ...prev,
          {
            ...newSelectedToken,
            initialMC: newSelectedToken.marketCap,
            currentMC: newSelectedToken.marketCap,
            buyTime: new Date(),
            buyAmount: tradingParams.buyAmount,
          },
        ])
        setNewTokens((prev) => prev.filter((token) => token.address !== newSelectedToken.address))
      }
    }
  }, [selectedTokens, tradingParams.maxTrade, tradingParams.buyMC, tradingParams.buyAmount, newTokens, socialChecks])

  useEffect(() => {
    if (isTrading) {
      const interval = setInterval(() => {
        // Simulate new token (in production, fetch from Raydium API)
        const mockNewToken: Token = {
          name: `Token${Math.floor(Math.random() * 1000)}`,
          marketCap: Number((Math.random() * 1000 + 40).toFixed(2)), // in SOL, ensuring it's always above 40
          symbol: "NEW",
          address: `${Math.random().toString(36).substring(2, 15)}`,
          initialMC: 0,
          currentMC: 0,
          buyTime: new Date(),
          buyAmount: 0,
          hasTwitter: Math.random() < 0.7, // 70% chance of having Twitter
          hasTelegram: Math.random() < 0.6, // 60% chance of having Telegram
          hasWebsite: Math.random() < 0.8, // 80% chance of having a website
        }

        setNewTokens((prev) => [mockNewToken, ...prev].slice(0, 10))

        // Update market caps for selected tokens
        setSelectedTokens((prev) =>
          prev.map((token) => {
            const mcChange = Number((Math.random() * 4 - 2).toFixed(2)) // Random change between -2 and 2 SOL
            return {
              ...token,
              currentMC: Number((token.currentMC + mcChange).toFixed(2)),
            }
          }),
        )

        checkAndExecuteTrades()
        selectNewToken()
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [isTrading, checkAndExecuteTrades, selectNewToken])

  // Simulated IP changer (hidden from UI)
  useEffect(() => {
    if (isTrading) {
      const interval = setInterval(() => {
        console.log("IP changed") // This will only show in the console, not in the UI
        // In a real implementation, this would integrate with a VPN or proxy service
      }, 20000) // Change IP every 20 seconds (3 times per minute)

      return () => clearInterval(interval)
    }
  }, [isTrading])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const indexOfLastTransaction = currentPage * transactionsPerPage
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage
  const currentTransactions = tradeHistory.slice(indexOfFirstTransaction, indexOfLastTransaction)
  const totalPages = Math.ceil(tradeHistory.length / transactionsPerPage)

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Logo and Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ARCH%20ANGEL%20bot.jpg-otGMtQJl0VNjrBOmrTXqVnSq5lI7RW.jpeg"
              alt="Arch Angel Trading Bot"
              width={80}
              height={80}
              className="rounded-full"
            />
            <div>
              <h1 className="text-2xl font-bold text-white">ARCH ANGEL</h1>
              <p className="text-gray-400">Trading Bot</p>
            </div>
          </div>
          <Button onClick={connectWallet}>
            {wallet ? `Connected: ${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "Connect Wallet"}
          </Button>
        </div>

        {/* Trading Parameters */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Amount to Buy (SOL)</label>
            <Input
              type="number"
              placeholder="1.0"
              value={tradingParams.buyAmount}
              onChange={(e) => setTradingParams((prev) => ({ ...prev, buyAmount: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Max Trades</label>
            <Input
              type="number"
              placeholder="2"
              value={tradingParams.maxTrade}
              onChange={(e) => setTradingParams((prev) => ({ ...prev, maxTrade: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Buy Market Cap (SOL)</label>
            <Input
              type="number"
              placeholder="50"
              value={tradingParams.buyMC}
              onChange={(e) => setTradingParams((prev) => ({ ...prev, buyMC: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Sell Market Cap Increase (SOL)</label>
            <Input
              type="number"
              placeholder="10"
              value={tradingParams.sellMC}
              onChange={(e) => setTradingParams((prev) => ({ ...prev, sellMC: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Stop Loss (SOL)</label>
            <Input
              type="number"
              placeholder="2"
              value={tradingParams.stopLoss}
              onChange={(e) => setTradingParams((prev) => ({ ...prev, stopLoss: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Slippage (%)</label>
            <Input
              type="number"
              placeholder="0.0"
              value={tradingParams.slippage}
              onChange={(e) => setTradingParams((prev) => ({ ...prev, slippage: Number(e.target.value) }))}
            />
          </div>
        </div>

        {/* Social Media Checks */}
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(socialChecks).map(([platform, checked]) => (
            <Card key={platform} className="p-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setSocialChecks((prev) => ({ ...prev, [platform]: !prev[platform] }))}
                />
                <span className="capitalize">{platform}</span>
              </label>
            </Card>
          ))}
        </div>

        {/* Trading Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <h3>Winning Trades</h3>
            <p className="text-2xl text-green-500">{tradeStats.wins}</p>
          </Card>
          <Card className="p-4">
            <h3>Stop Loss Hit</h3>
            <p className="text-2xl text-red-500">{tradeStats.losses}</p>
          </Card>
          <Card className="p-4">
            <h3>Total Profit (SOL)</h3>
            <p className="text-2xl">{tradeStats.totalProfit.toFixed(2)} SOL</p>
          </Card>
        </div>

        {/* Selected Tokens */}
        <Card className="p-4">
          <h3 className="mb-4">
            Selected Tokens ({selectedTokens.length}/{tradingParams.maxTrade})
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token Name</TableHead>
                <TableHead>Initial MC (SOL)</TableHead>
                <TableHead>Current MC (SOL)</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Time Held</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedTokens.map((token) => {
                const mcChange = token.currentMC - token.initialMC
                const timeHeld = Math.floor((new Date().getTime() - token.buyTime.getTime()) / 1000) // in seconds
                return (
                  <TableRow key={token.address}>
                    <TableCell>{token.name}</TableCell>
                    <TableCell>{token.initialMC.toFixed(2)}</TableCell>
                    <TableCell>{token.currentMC.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {mcChange > 0 ? <ArrowUp className="text-green-500" /> : <ArrowDown className="text-red-500" />}
                        <span className={mcChange > 0 ? "text-green-500" : "text-red-500"}>
                          {mcChange.toFixed(2)} SOL
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{timeHeld}s</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => executeSell(token, mcChange > 0 ? "WIN" : "SL")}
                      >
                        Sell
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>

        {/* New Tokens Table */}
        <Card className="p-4">
          <h3 className="mb-4">New Tokens (Last 10)</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token Name</TableHead>
                <TableHead>Market Cap (SOL)</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newTokens.map((token) => (
                <TableRow key={token.address}>
                  <TableCell>{token.name}</TableCell>
                  <TableCell>{token.marketCap.toFixed(2)} SOL</TableCell>
                  <TableCell>{token.symbol}</TableCell>
                  <TableCell>
                    <a
                      href={`https://raydium.io/swap/?inputCurrency=sol&outputCurrency=${token.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-500 hover:text-blue-400"
                    >
                      {token.address.slice(0, 6)}...{token.address.slice(-4)}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Trade History */}
        <Card className="p-4">
          <h3 className="mb-4">Trade History</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Buy MC (SOL)</TableHead>
                <TableHead>Sell MC (SOL)</TableHead>
                <TableHead>Buy Amount (SOL)</TableHead>
                <TableHead>Profit/Loss (SOL)</TableHead>
                <TableHead>TX Link</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentTransactions.map((trade, index) => (
                <TableRow key={index}>
                  <TableCell>{trade.name}</TableCell>
                  <TableCell>{trade.buyMC.toFixed(2)}</TableCell>
                  <TableCell>{trade.sellMC.toFixed(2)}</TableCell>
                  <TableCell>{trade.buyAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={trade.profit > 0 ? "text-green-500" : "text-red-500"}>
                      {trade.profit.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <a
                      href={trade.txLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-500 hover:text-blue-400"
                    >
                      View
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant={trade.result === "WIN" ? "success" : "destructive"}>{trade.result}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex justify-between items-center">
            <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
              Previous
            </Button>
            <span>
              {currentPage}/{totalPages}
            </span>
            <Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
              Next
            </Button>
          </div>
        </Card>

        {/* Start/Stop Trading */}
        <div className="flex justify-center">
          <Button
            onClick={() => setIsTrading(!isTrading)}
            className={`w-48 ${isTrading ? "bg-red-500" : "bg-green-500"}`}
          >
            {isTrading ? "Stop Trading" : "Start Trading"}
          </Button>
        </div>
      </div>
    </div>
  )
}

