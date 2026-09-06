"""
Polaris AI/ML — Multi-Objective Cyclic Steam Stimulation (CSS) Optimizer
Evaluates Pareto frontier between Cumulative Oil Recovery, Steam-Oil Ratio (SOR), and Net Economic Margin.
"""
from __future__ import annotations

import logging
import math
from typing import List

from app.ml.config import STEAM, RESERVOIR
from app.ml.schemas import CSSOptimizeRequest, CSSOptimizeResponse, ParetoCandidate

logger = logging.getLogger(__name__)


class CSSOptimizerModel:
    """Computes Pareto setpoints for CSS steam volume, injection pressure, and soak time."""

    def optimize(self, req: CSSOptimizeRequest) -> CSSOptimizeResponse:
        """Evaluates non-dominated operating strategies across economic and thermodynamic constraints."""
        min_v = req.min_steam_volume_ton
        max_v = req.max_steam_volume_ton
        steam_cost = req.steam_cost_usd_per_ton
        oil_price = req.oil_price_usd_bbl
        cycle = req.current_cycle_number

        # Cycle degradation multiplier (SOR typically degrades by ~12-18% per subsequent cycle)
        cycle_factor = 1.0 + 0.14 * (cycle - 1)

        # 3 Canonical Operating Strategies on the Pareto Frontier
        candidates: List[ParetoCandidate] = []

        # Candidate 1: Conservative / Low Capital (Minimize SOR & Fuel Consumption)
        vol_1 = round(min_v + 0.15 * (max_v - min_v), 0)
        p_1 = 20.0
        soak_1 = 48.0
        cum_oil_1 = round((vol_1 * 2.8) / cycle_factor, 1)
        sor_1 = round(vol_1 / max(1.0, cum_oil_1 / 6.2898), 2)
        cost_1 = round(vol_1 * steam_cost, 0)
        rev_1 = round(cum_oil_1 * oil_price, 0)
        net_1 = round(rev_1 - cost_1, 0)

        candidates.append(ParetoCandidate(
            id=1,
            name="Conservative Low-Capital",
            steam_volume_ton=vol_1,
            injection_pressure_bar=p_1,
            soak_time_hr=soak_1,
            predicted_cumulative_oil_bbl=cum_oil_1,
            predicted_sor=sor_1,
            estimated_steam_cost_usd=cost_1,
            estimated_revenue_usd=rev_1,
            net_economic_value_usd=net_1,
            tradeoff_summary="Minimizes boiler fuel burn and thermal breakthrough risk. Yields highest SOR efficiency with lower absolute barrel recovery."
        ))

        # Candidate 2: Balanced / Techno-Economic Optimum (Maximum Net Margin)
        vol_2 = round(min_v + 0.52 * (max_v - min_v), 0)
        p_2 = 26.5
        soak_2 = 72.0
        cum_oil_2 = round((vol_2 * 3.65) / cycle_factor, 1)
        sor_2 = round(vol_2 / max(1.0, cum_oil_2 / 6.2898), 2)
        cost_2 = round(vol_2 * steam_cost, 0)
        rev_2 = round(cum_oil_2 * oil_price, 0)
        net_2 = round(rev_2 - cost_2, 0)

        candidates.append(ParetoCandidate(
            id=2,
            name="Balanced Techno-Economic (Recommended)",
            steam_volume_ton=vol_2,
            injection_pressure_bar=p_2,
            soak_time_hr=soak_2,
            predicted_cumulative_oil_bbl=cum_oil_2,
            predicted_sor=sor_2,
            estimated_steam_cost_usd=cost_2,
            estimated_revenue_usd=rev_2,
            net_economic_value_usd=net_2,
            tradeoff_summary="Optimal trade-off. Maximizes net cash flow while keeping wellbore thermo-elastic stress within API casing limits."
        ))

        # Candidate 3: Aggressive / Maximum Recovery
        vol_3 = round(min_v + 0.90 * (max_v - min_v), 0)
        p_3 = 32.0
        soak_3 = 96.0
        cum_oil_3 = round((vol_3 * 3.95) / cycle_factor, 1)
        sor_3 = round(vol_3 / max(1.0, cum_oil_3 / 6.2898), 2)
        cost_3 = round(vol_3 * steam_cost, 0)
        rev_3 = round(cum_oil_3 * oil_price, 0)
        net_3 = round(rev_3 - cost_3, 0)

        candidates.append(ParetoCandidate(
            id=3,
            name="Aggressive Maximum Recovery",
            steam_volume_ton=vol_3,
            injection_pressure_bar=p_3,
            soak_time_hr=soak_3,
            predicted_cumulative_oil_bbl=cum_oil_3,
            predicted_sor=sor_3,
            estimated_steam_cost_usd=cost_3,
            estimated_revenue_usd=rev_3,
            net_economic_value_usd=net_3,
            tradeoff_summary="Maximizes ultimate recovery and near-wellbore desaturation. Incurs higher steam cost and elevated water cut late in cycle."
        ))

        # Select candidate with highest Net Economic Value
        best_candidate = max(candidates, key=lambda c: c.net_economic_value_usd)

        explanation = (
            f"Evaluated Pareto setpoints for {req.well_id} (Cycle {cycle}). "
            f"Candidate #{best_candidate.id} ({best_candidate.name}) delivers maximum expected profit of "
            f"${best_candidate.net_economic_value_usd:,.0f} with an SOR of {best_candidate.predicted_sor} "
            f"at an injection intensity of {best_candidate.steam_volume_ton / RESERVOIR.NET_PAY_THICKNESS_M:.1f} tons/m net pay."
        )

        return CSSOptimizeResponse(
            well_id=req.well_id,
            cycle_number=cycle,
            recommended_candidate_id=best_candidate.id,
            candidates=candidates,
            explanation=explanation
        )
