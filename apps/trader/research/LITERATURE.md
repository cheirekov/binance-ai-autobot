# Research basis for portfolio protocol v3

This note records hypothesis sources, not proof that the implementation is
profitable.

- Han, Kang and Ryu, *Momentum in the Cryptocurrency Market: A Comprehensive
  Analysis under Realistic Assumptions* (accepted by Review of Asset Pricing
  Studies) reports stronger evidence for time-series momentum than for
  cross-sectional momentum after considering liquidation and heavy-tailed
  returns: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4675565
- Bui and Nguyen, *Systematic Trend-Following with Adaptive Portfolio
  Construction* is a 2026 preprint, not treated as independently confirmed
  production evidence. It motivates testing intermediate timeframes,
  volatility-aware risk and explicit turnover. Its futures, long/short,
  150-asset and 4-bps assumptions are materially different from this spot bot:
  https://arxiv.org/abs/2602.11708
- Binance's current regular spot fee table lists 0.10% maker/taker and a
  separate USDC taker rate. The protocol retains 0.10% plus a 0.05% slippage
  allowance instead of assuming a promotional or VIP rate:
  https://www.binance.com/en/fee/trading

Protocol v3 therefore tests only each asset's own lagged 30/90-day return,
weekly long/cash allocation, inverse-volatility weighting and no leverage. It
does not copy claimed paper returns, introduce shorts, or rank thousands of
survivorship-biased coins.
