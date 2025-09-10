// Fix for Senior to Principal promotion tier calculation
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (window.calculator) {
            // Fix the Principal tier calculation
            window.calculator.calculatePrincipalTiers = function(billings, breakdown, startingPoint) {
                startingPoint = startingPoint || 0;
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

            // Override calculation for Senior to Principal promotions
            const original = window.calculator.calculateCommission.bind(window.calculator);
            window.calculator.calculateCommission = function(billings, level, isFirstYear, h1Billings, h2Billings) {
                const result = original(billings, level, isFirstYear, h1Billings, h2Billings);
                
                if ((level === 'Senior Consultant' || level === 'Consultant' || level === 'Consultant II') && 
                    result.finalLevel === 'Principal Consultant' && 
                    result.promotionPoints && result.promotionPoints.length > 0) {
                    
                    const principalPromotionPoint = result.promotionPoints[result.promotionPoints.length - 1];
                    
                    for (let i = 0; i < result.breakdown.length; i++) {
                        if (result.breakdown[i].level.includes('Principal Consultant')) {
                            let principalBillings = 0;
                            let principalStartIndex = i;
                            
                            for (let j = i; j < result.breakdown.length; j++) {
                                if (result.breakdown[j].level.includes('Principal Consultant')) {
                                    principalBillings += result.breakdown[j].billings;
                                }
                            }
                            
                            const beforePrincipal = result.breakdown.slice(0, principalStartIndex);
                            const tempBreakdown = [];
                            const principalCommission = this.calculatePrincipalTiers(principalBillings, tempBreakdown, principalPromotionPoint);
                            
                            result.breakdown = [...beforePrincipal, ...tempBreakdown];
                            result.commission = result.breakdown.reduce((sum, item) => sum + item.commission, 0);
                            break;
                        }
                    }
                }
                
                return result;
            };
            
            window.calculator.updateCalculation();
            console.log('✓ Principal tier fix applied!');
        }
    }, 500);
});
