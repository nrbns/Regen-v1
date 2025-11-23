def calculate_xp(difficulty: int, streak_length: int, cadence: str) -> int:
    base = 8 + (difficulty * 4)
    cadence_bonus = 2 if cadence == "daily" else 5
    streak_bonus = 0
    if streak_length and streak_length % 7 == 0:
        streak_bonus = 10
    elif streak_length and streak_length % 30 == 0:
        streak_bonus = 40

    return int(base + cadence_bonus + streak_bonus)


