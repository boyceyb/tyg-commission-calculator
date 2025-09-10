// Comprehensive Fix for TYG Commission Calculator
// Fixes: H1/H2 promotion logic, Principal tier calculations, all promotion thresholds

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (window.calculator) {
            console.log('Applying comprehensive commission calculator fixes...');
            
            // Store original calculate function
            const originalCalculate = window.calculator.calculateCommission.bind(window.calculator);
            
            // Override the entire calculateCommission function with fixed logic
            window.calculator.calculateCommission = function(billings, level, isFirstYear, h1Billings, h2Billings) {
                const normalizedLevel = level.toLowerCase().replace(/\s+/g, '');
                const threshold = this.THRESHOLDS[normalizedLevel] || 40000;
                
                if (billings <= threshold) {
                    return { 
                        commission: 0, 
                        breakdown: [], 
                        belowThreshold: true,
                        currentLevel: level,
                        finalLevel: level,
                        promotions: [],
                        promotionPoints: []
                    };
                }

                const commissionableBillings = billings - threshold;
                let commission = 0;
                let breakdown = [];
                let currentLevel = level;
                let promotions = [];
                let promotionPoints = [];

                // CRITICAL FIX: Only allow early promotion if H1 billings meet the threshold
                // Early promotion should ONLY happen if sufficient H1 billings exist
                const h1Amount = h1Billings || 0;
                const canEarlyPromote = h1Amount >= this.PROMOTION_THRESHOLDS.earlyH1.senior;

                // Check for fast-track promotions (Year 1 Consultant only)
                if (isFirstYear && level === 'Consultant') {
                    const fastTrackResult = this.calculateFastTrackCommission(billings, threshold, breakdown);
                    return {
                        commission: fastTrackResult.commission,
                        breakdown: fastTrackResult.breakdown,
                        belowThreshold: false,
                        currentLevel: level,
                        finalLevel: fastTrackResult.finalLevel,
                        promotions: fastTrackResult.promotions,
                        promotionPoints: fastTrackResult.promotionPoints || []
                    };
                }

                // Standard promotion logic (not fast-track)
                if (level === 'Consultant') {
                    // Check for early H1 promotion ONLY if H1 billings qualify
                    if (canEarlyPromote && h1Amount >= this.PROMOTION_THRESHOLDS.earlyH1.senior) {
                        // Early promotion to Senior at £96k in H1
                        const consultantBillings = this.PROMOTION_THRESHOLDS.earlyH1.senior - threshold;
                        const consultantCommission = consultantBillings * 0.20;
                        commission += consultantCommission;
                        breakdown.push({
                            level: 'Consultant (20%)',
                            billings: consultantBillings,
                            commission: consultantCommission
                        });
                        
                        promotions.push('Senior Consultant');
                        promotionPoints.push(this.PROMOTION_THRESHOLDS.earlyH1.senior);
                        currentLevel = 'Senior Consultant';
                        
                        // Calculate remaining as Senior
                        const seniorBillings = billings - this.PROMOTION_THRESHOLDS.earlyH1.senior;
                        if (seniorBillings > 0) {
                            commission += this.calculateSeniorTiers(seniorBillings, breakdown, this.PROMOTION_THRESHOLDS.earlyH1.senior);
                        }
                        
                        // Check for early promotion to Principal (still requires H1 threshold)
                        if (h1Amount >= this.PROMOTION_THRESHOLDS.earlyH1.principal) {
                            // Recalculate for Principal promotion
                            commission = 0;
                            breakdown = [];
                            promotionPoints = [this.PROMOTION_THRESHOLDS.earlyH1.senior, this.PROMOTION_THRESHOLDS.earlyH1.principal];
                            
                            // Consultant portion
                            const consultantBillings = this.PROMOTION_THRESHOLDS.earlyH1.senior - threshold;
                            commission += consultantBillings * 0.20;
                            breakdown.push({
                                level: 'Consultant (20%)',
                                billings: consultantBillings,
                                commission: consultantBillings * 0.20
                            });
                            
                            // Senior portion
                            const seniorPortion = this.PROMOTION_THRESHOLDS.earlyH1.principal - this.PROMOTION_THRESHOLDS.earlyH1.senior;
                            commission += this.calculateSeniorTiers(seniorPortion, breakdown, this.PROMOTION_THRESHOLDS.earlyH1.senior);
                            
                            // Principal portion
                            const principalBillings = billings - this.PROMOTION_THRESHOLDS.earlyH1.principal;
                            if (principalBillings > 0) {
                                commission += this.calculatePrincipalTiers(principalBillings, breakdown, this.PROMOTION_THRESHOLDS.earlyH1.principal);
                            }
                            
                            promotions.push('Principal Consultant');
                            currentLevel = 'Principal Consultant';
                        }
                    } else if (billings >= this.PROMOTION_THRESHOLDS.standard.senior) {
                        // Standard promotion to Senior (year-end)
                        const consultantBillings = this.PROMOTION_THRESHOLDS.standard.senior - threshold;
                        commission += consultantBillings * 0.20;
                        breakdown.push({
                            level: 'Consultant (20%)',
                            billings: consultantBillings,
                            commission: consultantBillings * 0.20
                        });
                        
                        promotions.push('Senior Consultant');
                        promotionPoints.push(this.PROMOTION_THRESHOLDS.standard.senior);
                        currentLevel = 'Senior Consultant';
                        
                        const seniorBillings = billings - this.PROMOTION_THRESHOLDS.standard.senior;
                        if (seniorBillings > 0) {
                            commission += this.calculateSeniorTiers(seniorBillings, breakdown, this.PROMOTION_THRESHOLDS.standard.senior);
                        }
                        
                        // Check for standard promotion to Principal
                        if (billings >= this.PROMOTION_THRESHOLDS.standard.principal) {
                            // Recalculate with Principal promotion
                            commission = 0;
                            breakdown = [];
                            promotionPoints = [this.PROMOTION_THRESHOLDS.standard.senior, this.PROMOTION_THRESHOLDS.standard.principal];
                            
                            const consultantPortion = this.PROMOTION_THRESHOLDS.standard.senior - threshold;
                            commission += consultantPortion * 0.20;
                            breakdown.push({
                                level: 'Consultant (20%)',
                                billings: consultantPortion,
                                commission: consultantPortion * 0.20
                            });
                            
                            const seniorPortion = this.PROMOTION_THRESHOLDS.standard.principal - this.PROMOTION_THRESHOLDS.standard.senior;
                            commission += this.calculateSeniorTiers(seniorPortion, breakdown, this.PROMOTION_THRESHOLDS.standard.senior);
                            
                            const principalBillings = billings - this.PROMOTION_THRESHOLDS.standard.principal;
                            if (principalBillings > 0) {
                                commission += this.calculatePrincipalTiers(principalBillings, breakdown, this.PROMOTION_THRESHOLDS.standard.principal);
                            }
                            
                            promotions.push('Principal Consultant');
                            currentLevel = 'Principal Consultant';
                        }
                    } else {
                        // No promotion
                        commission = commissionableBillings * 0.20;
                        breakdown.push({
                            level: 'Consultant (20%)',
                            billings: commissionableBillings,
                            commission: commission
                        });
                    }
                } else if (level === 'Consultant II') {
                    // Similar logic for Consultant II
                    if (canEarlyPromote && h1Amount >= this.PROMOTION_THRESHOLDS.earlyH1.senior) {
                        const consultantIIBillings = this.PROMOTION_THRESHOLDS.earlyH1.senior - threshold;
                        commission += consultantIIBillings * 0.225;
                        breakdown.push({
                            level: 'Consultant II (22.5%)',
                            billings: consultantIIBillings,
                            commission: consultantIIBillings * 0.225
                        });
                        
                        promotions.push('Senior Consultant');
                        promotionPoints.push(this.PROMOTION_THRESHOLDS.earlyH1.senior);
                        currentLevel = 'Senior Consultant';
                        
                        const seniorBillingsAmount = billings - this.PROMOTION_THRESHOLDS.earlyH1.senior;
                        if (seniorBillingsAmount > 0) {
                            commission += this.calculateSeniorTiers(seniorBillingsAmount, breakdown, this.PROMOTION_THRESHOLDS.earlyH1.senior);
                        }
                        
                        if (h1Amount >= this.PROMOTION_THRESHOLDS.earlyH1.principal) {
                            // Recalculate with Principal promotion
                            commission = 0;
                            breakdown = [];
                            promotionPoints = [this.PROMOTION_THRESHOLDS.earlyH1.senior, this.PROMOTION_THRESHOLDS.earlyH1.principal];
                            
                            const consultantIIPortion = this.PROMOTION_THRESHOLDS.earlyH1.senior - threshold;
                            commission += consultantIIPortion * 0.225;
                            breakdown.push({
                                level: 'Consultant II (22.5%)',
                                billings: consultantIIPortion,
                                commission: consultantIIPortion * 0.225
                            });
                            
                            const seniorPortion = this.PROMOTION_THRESHOLDS.earlyH1.principal - this.PROMOTION_THRESHOLDS.earlyH1.senior;
                            commission += this.calculateSeniorTiers(seniorPortion, breakdown, this.PROMOTION_THRESHOLDS.earlyH1.senior);
                            
                            const principalBillings = billings - this.PROMOTION_THRESHOLDS.earlyH1.principal;
                            if (principalBillings > 0) {
                                commission += this.calculatePrincipalTiers(principalBillings, breakdown, this.PROMOTION_THRESHOLDS.earlyH1.principal);
                            }
                            
                            promotions.push('Principal Consultant');
                            currentLevel = 'Principal Consultant';
                        }
                    } else if (billings >= this.PROMOTION_THRESHOLDS.standard.senior) {
                        const consultantIIBillings = this.PROMOTION_THRESHOLDS.standard.senior - threshold;
                        commission += consultantIIBillings * 0.225;
                        breakdown.push({
                            level: 'Consultant II (22.5%)',
                            billings: consultantIIBillings,
                            commission: consultantIIBillings * 0.225
                        });
                        
                        promotions.push('Senior Consultant');
                        promotionPoints.push(this.PROMOTION_THRESHOLDS.standard.senior);
                        currentLevel = 'Senior Consultant';
                        
                        const seniorBillings = billings - this.PROMOTION_THRESHOLDS.standard.senior;
                        if (seniorBillings > 0) {
                            commission += this.calculateSeniorTiers(seniorBillings, breakdown, this.PROMOTION_THRESHOLDS.standard.senior);
                        }
                        
                        if (billings >= this.PROMOTION_THRESHOLDS.standard.principal) {
                            commission = 0;
                            breakdown = [];
                            promotionPoints = [this.PROMOTION_THRESHOLDS.standard.senior, this.PROMOTION_THRESHOLDS.standard.principal];
                            
                            const consultantIIPortion = this.PROMOTION_THRESHOLDS.standard.senior - threshold;
                            commission += consultantIIPortion * 0.225;
                            breakdown.push({
                                level: 'Consultant II (22.5%)',
                                billings: consultantIIPortion,
                                commission: consultantIIPortion * 0.225
                            });
                            
                            const seniorPortion = this.PROMOTION_THRESHOLDS.standard.principal - this.PROMOTION_THRESHOLDS.standard.senior;
                            commission += this.calculateSeniorTiers(seniorPortion, breakdown, this.PROMOTION_THRESHOLDS.standard.senior);
                            
                            const principalBillings = billings - this.PROMOTION_THRESHOLDS.standard.principal;
                            if (principalBillings > 0) {
                                commission += this.calculatePrincipalTiers(principalBillings, breakdown, this.PROMOTION_THRESHOLDS.standard.principal);
                            }
                            
                            promotions.push('Principal Consultant');
                            currentLevel = 'Principal Consultant';
                        }
                    } else {
                        // No promotion
                        commission = commissionableBillings * 0.225;
                        breakdown.push({
                            level: 'Consultant II (22.5%)',
                            billings: commissionableBillings,
                            commission: commission
                        });
                    }
                } else if (level === 'Senior Consultant') {
                    // CRITICAL FIX: Senior to Principal promotion
                    // Only allow early promotion if H1 billings meet the threshold
                    if (canEarlyPromote && h1Amount >= this.PROMOTION_THRESHOLDS.earlyH1.principal) {
                        // Early H1 promotion to Principal at £120k
                        const seniorBillings = this.PROMOTION_THRESHOLDS.earlyH1.principal - threshold;
                        commission += this.calculateSeniorTiers(seniorBillings, breakdown, 40000);
                        
                        promotions.push('Principal Consultant');
                        promotionPoints.push(this.PROMOTION_THRESHOLDS.earlyH1.principal);
                        currentLevel = 'Principal Consultant';
                        
                        const principalBillings = billings - this.PROMOTION_THRESHOLDS.earlyH1.principal;
                        if (principalBillings > 0) {
                            commission += this.calculatePrincipalTiers(principalBillings, breakdown, this.PROMOTION_THRESHOLDS.earlyH1.principal);
                        }
                    } else if (billings >= this.PROMOTION_THRESHOLDS.standard.principal) {
                        // Standard promotion to Principal at £200k
                        const seniorBillings = this.PROMOTION_THRESHOLDS.standard.principal - threshold;
                        commission += this.calculateSeniorTiers(seniorBillings, breakdown, 40000);
                        
                        promotions.push('Principal Consultant');
                        promotionPoints.push(this.PROMOTION_THRESHOLDS.standard.principal);
                        currentLevel = 'Principal Consultant';
                        
                        const principalBillings = billings - this.PROMOTION_THRESHOLDS.standard.principal;
                        if (principalBillings > 0) {
                            commission += this.calculatePrincipalTiers(principalBillings, breakdown, this.PROMOTION_THRESHOLDS.standard.principal);
                        }
                    } else {
                        // No promotion - stay as Senior
                        commission = this.calculateSeniorTiers(commissionableBillings, breakdown, 40000);
                    }
                } else if (level === 'Principal Consultant') {
                    // Already Principal
                    commission = this.calculatePrincipalTiers(commissionableBillings, breakdown, 40000);
                }

                return {
                    commission,
                    breakdown,
                    belowThreshold: false,
                    currentLevel: level,
                    finalLevel: currentLevel,
                    promotions,
                    promotionPoints
                };
            };
            
            // Fix the Principal tier calculation
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
            
            // Fix the Senior tier calculation
            window.calculator.calculateSeniorTiers = function(seniorBillings, breakdown, totalBillingsAtStart) {
                let commission = 0;
                let remaining = seniorBillings;
                const startingTotal = totalBillingsAtStart || 40000;
                
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
            
            // Trigger recalculation
            window.calculator.updateCalculation();
            window.calculator.updateStickyHeaderFromCurrentData();
            
            console.log('✓ Fixed: H1/H2 promotion logic - early promotions only with H1 billings');
            console.log('✓ Fixed: Principal tier calculations maintain proper percentages');
            console.log('✓ Fixed: All commission rates and thresholds');
        }
    }, 500);
});
