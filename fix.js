// Aggressive fix for H1/H2 promotion bug
document.addEventListener('DOMContentLoaded', function() {
    // Keep trying until calculator exists
    let attempts = 0;
    const interval = setInterval(function() {
        attempts++;
        
        if (window.calculator && window.calculator.calculateCommission) {
            clearInterval(interval);
            
            console.log('Applying H1/H2 fix (attempt ' + attempts + ')...');
            
            // Save original thresholds
            const ORIG_THRESHOLDS = {
                earlyH1: {
                    senior: 96000,
                    principal: 120000
                },
                standard: {
                    senior: 160000,
                    principal: 200000
                }
            };
            
            // Override the PROMOTION_THRESHOLDS directly
            const origCalc = window.calculator.calculateCommission.bind(window.calculator);
            
            window.calculator.calculateCommission = function(billings, level, isFirstYear, h1Billings, h2Billings) {
                // Temporarily modify thresholds if H1 doesn't qualify for early promotion
                const h1Amount = h1Billings || 0;
                const savedThresholds = JSON.parse(JSON.stringify(this.PROMOTION_THRESHOLDS));
                
                // If H1 doesn't meet early thresholds, disable them
                if (h1Amount < ORIG_THRESHOLDS.earlyH1.senior) {
                    console.log('H1 insufficient (' + h1Amount + '), using standard thresholds only');
                    // Set early thresholds impossibly high so they won't trigger
                    this.PROMOTION_THRESHOLDS.earlyH1.senior = 999999999;
                    this.PROMOTION_THRESHOLDS.earlyH1.principal = 999999999;
                }
                
                // Calculate with modified thresholds
                const result = origCalc(billings, level, isFirstYear, h1Billings, h2Billings);
                
                // Restore original thresholds
                this.PROMOTION_THRESHOLDS = savedThresholds;
                
                // Log for debugging
                if (result.promotionPoints && result.promotionPoints.length > 0) {
                    console.log('Promotions at:', result.promotionPoints);
                }
                
                return result;
            };
            
            // Fix Principal tiers (keep existing fix)
            window.calculator.calculatePrincipalTiers = function(billings, breakdown, startingPoint) {
                startingPoint = startingPoint || 40000;
                let commission = 0;
                let remaining = billings;
                let currentTotal = startingPoint;
                
                if (currentTotal < 100000) {
                    const tier1Limit = 100000 - currentTotal;
                    const tier1 = Math.min(remaining, tier1Limit);
                    if (tier1 > 0) {
                        commission += tier1 * 0.25;
                        breakdown.push({
                            level: 'Principal Consultant (25%)',
                            billings: tier1,
                            commission: tier1 * 0.25
                        });
                        remaining -= tier1;
                        currentTotal += tier1;
                    }
                }
                
                if (remaining > 0 && currentTotal < 200000) {
                    const tier2Limit = 200000 - currentTotal;
                    const tier2 = Math.min(remaining, tier2Limit);
                    if (tier2 > 0) {
                        commission += tier2 * 0.30;
                        breakdown.push({
                            level: 'Principal Consultant (30%)',
                            billings: tier2,
                            commission: tier2 * 0.30
                        });
                        remaining -= tier2;
                        currentTotal += tier2;
                    }
                }
                
                if (remaining > 0 && currentTotal < 300000) {
                    const tier3Limit = 300000 - currentTotal;
                    const tier3 = Math.min(remaining, tier3Limit);
                    if (tier3 > 0) {
                        commission += tier3 * 0.35;
                        breakdown.push({
                            level: 'Principal Consultant (35%)',
                            billings: tier3,
                            commission: tier3 * 0.35
                        });
                        remaining -= tier3;
                        currentTotal += tier3;
                    }
                }
                
                if (remaining > 0 && currentTotal < 400000) {
                    const tier4Limit = 400000 - currentTotal;
                    const tier4 = Math.min(remaining, tier4Limit);
                    if (tier4 > 0) {
                        commission += tier4 * 0.40;
                        breakdown.push({
                            level: 'Principal Consultant (40%)',
                            billings: tier4,
                            commission: tier4 * 0.40
                        });
                        remaining -= tier4;
                        currentTotal += tier4;
                    }
                }
                
                if (remaining > 0) {
                    commission += remaining * 0.50;
                    breakdown.push({
                        level: 'Principal Consultant (50%)',
                        billings: remaining,
                        commission: remaining * 0.50
                    });
                }
                
                return commission;
            };
            
            // Recalculate
            window.calculator.updateCalculation();
            
            console.log('✓ H1/H2 fix applied! Early promotions will only trigger with sufficient H1 billings.');
            console.log('✓ Principal tier fix maintained.');
        }
        
        // Stop trying after 5 seconds
        if (attempts > 50) {
            clearInterval(interval);
            console.error('Could not apply fix - calculator not found');
        }
    }, 100);
});
