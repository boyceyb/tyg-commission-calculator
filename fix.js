// Complete fix for TYG Commission Calculator
// Fixes: H1/H2 promotions, Senior tiers, Principal tiers

document.addEventListener('DOMContentLoaded', function() {
    let attempts = 0;
    const interval = setInterval(function() {
        attempts++;
        
        if (window.calculator && window.calculator.calculateCommission) {
            clearInterval(interval);
            
            console.log('Applying complete fix (attempt ' + attempts + ')...');
            
            // Save original function
            const origCalc = window.calculator.calculateCommission.bind(window.calculator);
            
            // Override main calculation
            window.calculator.calculateCommission = function(billings, level, isFirstYear, h1Billings, h2Billings) {
                const h1Amount = h1Billings || 0;
                const savedThresholds = JSON.parse(JSON.stringify(this.PROMOTION_THRESHOLDS));
                
                // Disable early promotions if H1 insufficient
                if (h1Amount < 96000) {
                    console.log('H1 insufficient (' + h1Amount + '), using standard thresholds only');
                    this.PROMOTION_THRESHOLDS.earlyH1.senior = 999999999;
                    this.PROMOTION_THRESHOLDS.earlyH1.principal = 999999999;
                }
                
                // Calculate with modified thresholds
                const result = origCalc(billings, level, isFirstYear, h1Billings, h2Billings);
                
                // Restore thresholds
                this.PROMOTION_THRESHOLDS = savedThresholds;
                
                // Fix Senior Consultant tiers if needed
                let needsRecalc = false;
                for (let i = 0; i < result.breakdown.length; i++) {
                    const item = result.breakdown[i];
                    
                    // Fix Senior Consultant starting at wrong tier
                    if (item.level === 'Senior Consultant (30%)') {
                        // Check what total billings were at this point
                        let totalAtThisPoint = 40000; // threshold
                        for (let j = 0; j < i; j++) {
                            totalAtThisPoint += result.breakdown[j].billings;
                        }
                        
                        // If we're under £100k total, this should be 25% not 30%
                        if (totalAtThisPoint < 100000) {
                            const amountAt25 = Math.min(item.billings, 100000 - totalAtThisPoint);
                            const amountAt30 = item.billings - amountAt25;
                            
                            if (amountAt25 > 0) {
                                // Replace this item with correct tiers
                                result.breakdown[i] = {
                                    level: 'Senior Consultant (25%)',
                                    billings: amountAt25,
                                    commission: amountAt25 * 0.25
                                };
                                
                                // Add 30% tier if needed
                                if (amountAt30 > 0) {
                                    result.breakdown.splice(i + 1, 0, {
                                        level: 'Senior Consultant (30%)',
                                        billings: amountAt30,
                                        commission: amountAt30 * 0.30
                                    });
                                }
                                needsRecalc = true;
                            }
                        }
                    }
                }
                
                // Recalculate commission if we made changes
                if (needsRecalc) {
                    result.commission = 0;
                    for (let item of result.breakdown) {
                        result.commission += item.commission;
                    }
                }
                
                // Log for debugging
                if (result.promotionPoints && result.promotionPoints.length > 0) {
                    console.log('Promotions at:', result.promotionPoints);
                }
                
                return result;
            };
            
            // Fix Principal tier calculation
            window.calculator.calculatePrincipalTiers = function(billings, breakdown, startingPoint) {
                // Default to 40k if not provided, but use actual starting point if given
                startingPoint = startingPoint || 40000;
                let commission = 0;
                let remaining = billings;
                let currentTotal = startingPoint;
                
                console.log('Principal starting at total billings:', startingPoint);
                
                // Skip 25% tier if we're already past £100k
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
                
                // 30% tier: £100k-200k
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
                
                // 35% tier: £200k-300k
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
                
                // 40% tier: £300k-400k
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
                
                // 50% tier: £400k+
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
            
            // Fix Senior tier calculation
            window.calculator.calculateSeniorTiers = function(seniorBillings, breakdown, totalBillingsAtStart) {
                let commission = 0;
                let remaining = seniorBillings;
                const startingTotal = totalBillingsAtStart || 40000;
                
                console.log('Senior starting at total billings:', startingTotal);
                
                // First tier: up to £100k total (25%)
                if (startingTotal < 100000) {
                    const tier1Limit = 100000 - startingTotal;
                    const tier1Amount = Math.min(remaining, tier1Limit);
                    
                    if (tier1Amount > 0) {
                        commission += tier1Amount * 0.25;
                        breakdown.push({
                            level: 'Senior Consultant (25%)',
                            billings: tier1Amount,
                            commission: tier1Amount * 0.25
                        });
                        remaining -= tier1Amount;
                    }
                }
                
                // Second tier: £100k+ total (30%)
                if (remaining > 0) {
                    commission += remaining * 0.30;
                    breakdown.push({
                        level: 'Senior Consultant (30%)',
                        billings: remaining,
                        commission: remaining * 0.30
                    });
                }
                
                return commission;
            };
            
            // Override calls to ensure starting points are passed
            const origCalculatePrincipalTiers = window.calculator.calculatePrincipalTiers.bind(window.calculator);
            const origMethod = window.calculator.calculateCommission;
            
            // Intercept and fix calls to calculatePrincipalTiers
            window.calculator.calculateCommission = function(billings, level, isFirstYear, h1Billings, h2Billings) {
                const result = origMethod.call(this, billings, level, isFirstYear, h1Billings, h2Billings);
                
                // If there's a Principal promotion, ensure tiers are correct
                if (result.finalLevel === 'Principal Consultant' && result.promotionPoints && result.promotionPoints.length > 0) {
                    const principalStartPoint = result.promotionPoints[result.promotionPoints.length - 1];
                    
                    // Find and fix Principal entries
                    let principalStartIndex = -1;
                    for (let i = 0; i < result.breakdown.length; i++) {
                        if (result.breakdown[i].level.includes('Principal Consultant')) {
                            principalStartIndex = i;
                            break;
                        }
                    }
                    
                    if (principalStartIndex >= 0 && principalStartPoint) {
                        // Collect all Principal billings
                        let totalPrincipalBillings = 0;
                        for (let i = principalStartIndex; i < result.breakdown.length; i++) {
                            if (result.breakdown[i].level.includes('Principal Consultant')) {
                                totalPrincipalBillings += result.breakdown[i].billings;
                            }
                        }
                        
                        // Remove old Principal entries
                        const beforePrincipal = result.breakdown.slice(0, principalStartIndex);
                        
                        // Recalculate with correct starting point
                        const tempBreakdown = [];
                        const principalCommission = this.calculatePrincipalTiers(totalPrincipalBillings, tempBreakdown, principalStartPoint);
                        
                        // Rebuild breakdown
                        result.breakdown = [...beforePrincipal, ...tempBreakdown];
                        
                        // Recalculate total
                        result.commission = 0;
                        for (let item of result.breakdown) {
                            result.commission += item.commission;
                        }
                    }
                }
                
                return result;
            };
            
            // Recalculate
            window.calculator.updateCalculation();
            
            console.log('✓ Complete fix applied!');
            console.log('✓ H1/H2 promotions fixed');
            console.log('✓ Senior tiers fixed (25% then 30%)');
            console.log('✓ Principal tiers fixed (continues from promotion point)');
        }
        
        if (attempts > 50) {
            clearInterval(interval);
            console.error('Could not apply fix - calculator not found');
        }
    }, 100);
});
