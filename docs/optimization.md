# Multi-Objective Optimization Methodology

## 1. Mathematical Formulation

The Joint Optimizer solves a constrained multi-objective problem balancing economics and mechanical health:

$$\max_{u \in \mathcal{U}} J(u) = w_1 \cdot \frac{Q_{oil}(u)}{Q_{oil}^0} + w_2 \cdot \frac{\eta_{pump}(u)}{\eta_{pump}^0} - w_3 \cdot \frac{\text{SOR}(u)}{\text{SOR}^0} - w_4 \cdot \frac{E_{kWh}(u)}{E_{kWh}^0} - w_5 \cdot R_{float}(u)$$

### Decision Variables ($u$):
- $V_{steam}$: Steam volume injected ($600 - 900\text{ tons}$)
- $P_{inj}$: Injection pressure ($18 - 25\text{ bar}$)
- $t_{soak}$: Soaking duration ($48 - 96\text{ hours}$)
- $SPM$: Pumping speed ($3.5 - 7.0\text{ SPM}$)
- $S$: Stroke length ($54 - 74\text{ inches}$)
- $f_{VFD}$: Variable frequency drive frequency ($25 - 45\text{ Hz}$)

### Hard Physics Constraints:
- $SPM \le SPM_{crit}(T_{res}, S) - \Delta_{margin}$ (Rod floating prevention)
- Peak Polished Rod Load $\le 0.85 \times \text{Yield Strength}$
- Steam Injection Pressure $\le \text{Formation Fracture Pressure}$
