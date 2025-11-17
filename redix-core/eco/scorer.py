"""
Eco Scorer - Green Intelligence Metrics
Sense-Optimize-Regenerate loop for sustainable AI

Redix Eco-Scoring: The first AI system that rewards low-energy responses
and penalizes waste — in real time.
"""

import psutil
import time
import math
from typing import Dict, Optional

class EcoScorer:
    """
    Green scoring system for Redix
    
    Philosophy: Sense → Optimize → Regenerate
    - Sense: Measure device state + prompt complexity
    - Optimize: Route to local models, trim prompts
    - Regenerate: Score output, reward efficiency, log carbon
    """
    
    def __init__(self):
        self.start_time: Optional[float] = None
        self.start_cpu: float = 0.0
        self.start_ram: float = 0.0
        self.is_local: bool = False
        self.token_count: int = 0
        self.start_metrics: Dict = {}
    
    def start_sensing(self, is_local: bool = False) -> Dict:
        """
        Begin eco measurement (Sense phase)
        
        Args:
            is_local: Whether using local model (Ollama)
        
        Returns:
            Dict with initial device metrics
        """
        self.start_time = time.time()
        self.is_local = is_local
        
        try:
            # Get CPU and RAM
            self.start_cpu = psutil.cpu_percent(interval=0.1)
            self.start_ram = psutil.virtual_memory().percent
            
            # Get battery info
            battery = None
            is_charging = True
            if hasattr(psutil, 'sensors_battery'):
                battery_info = psutil.sensors_battery()
                if battery_info:
                    battery = battery_info.percent
                    is_charging = battery_info.power_plugged
            
            self.start_metrics = {
                'cpu': self.start_cpu,
                'ram': self.start_ram,
                'battery': battery if battery is not None else 100,
                'is_charging': is_charging,
                'timestamp': self.start_time
            }
            
            return self.start_metrics
        except Exception as e:
            # Fallback if psutil fails
            self.start_metrics = {
                'cpu': 0.0,
                'ram': 0.0,
                'battery': 100,
                'is_charging': True,
                'timestamp': self.start_time or time.time()
            }
            return self.start_metrics
    
    def count_tokens(self, text: str) -> int:
        """
        Count tokens (rough estimate: 4 chars ≈ 1 token)
        
        Args:
            text: Text to count tokens for
        
        Returns:
            Estimated token count
        """
        # Rough estimation: 4 characters ≈ 1 token
        # For more accuracy, use tiktoken or similar
        self.token_count = max(1, len(text) // 4)
        return self.token_count
    
    def optimize_prompt(self, prompt: str, mode: str = "default") -> str:
        """
        Optimize: Trim prompt for efficiency
        
        Args:
            prompt: Original prompt
            mode: Mode ("default", "creative", "eco")
        
        Returns:
            Optimized prompt (trimmed if >500 chars)
        """
        if len(prompt) > 500 and mode != "creative":
            return prompt[:500] + " […]"
        return prompt
    
    def end_sensing(self) -> Dict:
        """
        Calculate full eco score (Regenerate phase)
        
        Returns:
            Dict with eco_score, green_tier, energy_wh, co2_saved_g, etc.
        """
        if self.start_time is None:
            raise ValueError("start_sensing() must be called before end_sensing()")
        
        # Get end metrics
        end_cpu = psutil.cpu_percent(interval=0.1)
        end_ram = psutil.virtual_memory().percent
        duration = time.time() - self.start_time
        
        # Get battery info
        battery_level = 100
        is_charging = True
        try:
            if hasattr(psutil, 'sensors_battery'):
                battery_info = psutil.sensors_battery()
                if battery_info:
                    battery_level = battery_info.percent
                    is_charging = battery_info.power_plugged
        except:
            pass
        
        # Calculate deltas
        cpu_delta = max(0, end_cpu - self.start_cpu)
        ram_delta = max(0, end_ram - self.start_ram)
        
        # Base penalties (from formula)
        token_penalty = self.token_count * 0.001
        cpu_penalty = cpu_delta * 0.05
        ram_penalty = ram_delta * 0.02
        
        # Cloud vs Local
        cloud_penalty = 15.0 if not self.is_local else 0.0
        local_bonus = 20.0 if self.is_local else 0.0
        
        # Battery-aware bonuses/penalties
        battery_save_bonus = 10.0 if battery_level < 30 and self.is_local else 0.0
        battery_drain_penalty = 5.0 if battery_level < 20 and not is_charging else 0.0
        
        # Final score calculation
        raw_score = 100.0
        raw_score -= (token_penalty + cpu_penalty + ram_penalty + cloud_penalty + battery_drain_penalty)
        raw_score += (local_bonus + battery_save_bonus)
        
        # Clamp to 0-100
        eco_score = max(0.0, min(100.0, round(raw_score, 2)))
        
        # Energy calculation (Wh)
        # Cloud: ~0.00042 Wh/token, Local: ~0.00001 Wh/token
        token_energy = self.token_count * (0.00001 if self.is_local else 0.00042)
        cpu_energy = cpu_delta * 0.01
        total_energy_wh = token_energy + cpu_energy
        
        # CO2 estimation (g CO₂e)
        # Global average: ~0.5 kg CO₂ per kWh
        co2_grams = total_energy_wh * 500  # 0.5 kg = 500g per kWh
        
        # CO2 saved if using local (vs cloud baseline)
        cloud_co2 = self.token_count * 0.00042 * 500  # Cloud baseline
        local_co2 = self.token_count * 0.00001 * 500  # Local baseline
        co2_saved_g = (cloud_co2 - local_co2) if self.is_local else 0.0
        
        # Get tier and recommendation
        green_tier = self.get_tier(eco_score)
        recommendation = self.get_recommendation(eco_score, battery_level, self.is_local)
        
        return {
            "eco_score": eco_score,
            "green_tier": green_tier,
            "tier_color": self.get_tier_color(green_tier),
            "energy_wh": round(total_energy_wh, 6),
            "co2_emitted_g": round(co2_grams, 2),
            "co2_saved_g": round(co2_saved_g, 2),
            "tokens": self.token_count,
            "cpu_delta": round(cpu_delta, 1),
            "ram_delta": round(ram_delta, 1),
            "duration_ms": round(duration * 1000, 1),
            "model_mode": "local" if self.is_local else "cloud",
            "battery_level": battery_level,
            "is_charging": is_charging,
            "recommendation": recommendation,
            "timestamp": time.time()
        }
    
    def get_tier(self, score: float) -> str:
        """
        Get green tier based on score
        
        Args:
            score: Eco score (0-100)
        
        Returns:
            Tier string: "Ultra Green", "Green", "Yellow", or "Red"
        """
        if score >= 90:
            return "Ultra Green"
        elif score >= 75:
            return "Green"
        elif score >= 50:
            return "Yellow"
        else:
            return "Red"
    
    def get_tier_color(self, tier: str) -> str:
        """
        Get color for tier (for UI)
        
        Args:
            tier: Tier string
        
        Returns:
            Hex color code
        """
        colors = {
            "Ultra Green": "#10b981",  # emerald-500
            "Green": "#22c55e",         # green-500
            "Yellow": "#f59e0b",         # amber-500
            "Red": "#ef4444"             # red-500
        }
        return colors.get(tier, "#6b7280")  # gray-500 default
    
    def get_recommendation(
        self, 
        score: float, 
        battery: int, 
        is_local: bool
    ) -> str:
        """
        Get recommendation based on score and context
        
        Args:
            score: Eco score
            battery: Battery level (0-100)
            is_local: Whether using local model
        
        Returns:
            Recommendation string
        """
        if battery < 30 and not is_local:
            return "Switching to local mode to save battery"
        elif battery < 30 and is_local:
            return "Excellent - Local mode saving battery"
        elif score < 50:
            return "Shorten prompt or enable local AI"
        elif score < 75:
            return "Consider local model for better eco"
        elif score >= 90:
            return "Optimal efficiency — AI healed the planet!"
        else:
            return "Good efficiency"
    
    def regenerate_score(
        self, 
        tokens: int, 
        is_local: bool = True,
        start_metrics: Optional[Dict] = None
    ) -> Dict:
        """
        Legacy method: Regenerate score (backward compatibility)
        
        Args:
            tokens: Token count
            is_local: Whether using local model
            start_metrics: Starting metrics (optional)
        
        Returns:
            Eco score dict
        """
        if start_metrics:
            self.start_metrics = start_metrics
        else:
            self.start_sensing(is_local=is_local)
        
        self.token_count = tokens
        return self.end_sensing()
    
    def sense_device(self) -> Dict:
        """
        Legacy method: Sense device (backward compatibility)
        
        Returns:
            Device metrics dict
        """
        return self.start_sensing(self.is_local)

