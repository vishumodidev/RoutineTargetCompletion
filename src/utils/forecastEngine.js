/**
 * Opportunity Forecast Engine
 * for RoutineTargetCompletion (Step 4: Forecasts and Weekly Reviews)
 *
 * Implements:
 * - Deterministic separation between Actual Realized Revenue and Weighted Pipeline Forecasts
 * - Stage conversion metrics & probability distribution
 * - Deal close date tracking & overdue deal detection
 * - Zero LLM dependency, 100% mathematical integrity
 */

export const PIPELINE_STAGES = {
  NEW_LEADS: 'New Leads',
  QUALIFIED_LEADS: 'Qualified Leads',
  MEETINGS: 'Meetings',
  PROPOSALS: 'Proposals',
  NEGOTIATIONS: 'Negotiations',
  CONFIRMED: 'Confirmed',
  LOST: 'Lost'
};

export const STAGE_DEFAULT_PROBABILITIES = {
  [PIPELINE_STAGES.NEW_LEADS]: 10,
  [PIPELINE_STAGES.QUALIFIED_LEADS]: 30,
  [PIPELINE_STAGES.MEETINGS]: 50,
  [PIPELINE_STAGES.PROPOSALS]: 70,
  [PIPELINE_STAGES.NEGOTIATIONS]: 80,
  [PIPELINE_STAGES.CONFIRMED]: 100,
  [PIPELINE_STAGES.LOST]: 0
};

/**
 * Calculates pipeline forecasts and separate realized revenue from open opportunities
 *
 * @param {Array} opportunities List of opportunity objects
 * @param {Date|string} referenceDate Date to assess overdue deals (defaults to today)
 * @returns {Object} Forecast metrics
 */
export function calculatePipelineForecast(opportunities = [], referenceDate = new Date()) {
  const refDate = new Date(referenceDate);
  refDate.setHours(0, 0, 0, 0);
  const refDateStr = refDate.toISOString().split('T')[0];

  const oppList = Array.isArray(opportunities) ? opportunities : [];

  let actualRevenue = 0;
  let openPipelineTotal = 0;
  let weightedPipelineForecast = 0;
  let wonDealsCount = 0;
  let lostDealsCount = 0;
  let openDealsCount = 0;

  const stageBreakdown = {
    [PIPELINE_STAGES.NEW_LEADS]: { count: 0, totalValue: 0, weightedValue: 0 },
    [PIPELINE_STAGES.QUALIFIED_LEADS]: { count: 0, totalValue: 0, weightedValue: 0 },
    [PIPELINE_STAGES.MEETINGS]: { count: 0, totalValue: 0, weightedValue: 0 },
    [PIPELINE_STAGES.PROPOSALS]: { count: 0, totalValue: 0, weightedValue: 0 },
    [PIPELINE_STAGES.NEGOTIATIONS]: { count: 0, totalValue: 0, weightedValue: 0 },
    [PIPELINE_STAGES.CONFIRMED]: { count: 0, totalValue: 0, weightedValue: 0 },
    [PIPELINE_STAGES.LOST]: { count: 0, totalValue: 0, weightedValue: 0 }
  };

  const overdueDeals = [];

  oppList.forEach(opp => {
    const val = Number(opp.value) || 0;
    const stage = opp.stage || PIPELINE_STAGES.NEW_LEADS;
    const isWon = stage === PIPELINE_STAGES.CONFIRMED || stage === 'Closed-Won';
    const isLost = stage === PIPELINE_STAGES.LOST || stage === 'Closed-Lost';

    let prob = opp.probability !== undefined && opp.probability !== null && !isNaN(Number(opp.probability))
      ? Number(opp.probability)
      : (STAGE_DEFAULT_PROBABILITIES[stage] !== undefined ? STAGE_DEFAULT_PROBABILITIES[stage] : 10);
    prob = Math.max(0, Math.min(100, prob));

    const weightedVal = Math.round(val * (prob / 100));

    // Initialize custom stage if missing
    if (!stageBreakdown[stage]) {
      stageBreakdown[stage] = { count: 0, totalValue: 0, weightedValue: 0 };
    }
    stageBreakdown[stage].count += 1;
    stageBreakdown[stage].totalValue += val;
    stageBreakdown[stage].weightedValue += weightedVal;

    if (isWon) {
      actualRevenue += val;
      wonDealsCount++;
    } else if (isLost) {
      lostDealsCount++;
    } else {
      // Active open deal
      openPipelineTotal += val;
      weightedPipelineForecast += weightedVal;
      openDealsCount++;

      // Overdue check
      if (opp.expectedCloseDate) {
        const closeDateStr = String(opp.expectedCloseDate).split('T')[0];
        if (closeDateStr < refDateStr) {
          const closeDate = new Date(closeDateStr);
          closeDate.setHours(0, 0, 0, 0);
          const pastDays = Math.round((refDate.getTime() - closeDate.getTime()) / (1000 * 60 * 60 * 24));
          overdueDeals.push({
            id: opp.id || opp.opportunityId,
            title: opp.title || opp.clientName,
            value: val,
            stage,
            expectedCloseDate: closeDateStr,
            daysPast: pastDays,
            daysPastDue: pastDays
          });
        }
      }
    }
  });

  const closedTotal = wonDealsCount + lostDealsCount;
  const winRatePercent = closedTotal > 0 ? Math.round((wonDealsCount / closedTotal) * 100) : 0;

  return {
    actualRevenue,
    openPipelineTotal,
    weightedPipelineForecast,
    totalDealsCount: oppList.length,
    openDealsCount,
    activeDealsCount: openDealsCount,
    wonDealsCount,
    lostDealsCount,
    winRatePercent,
    stageBreakdown,
    overdueDealsCount: overdueDeals.length,
    overdueDeals,
    referenceDateStr: refDateStr
  };
}
