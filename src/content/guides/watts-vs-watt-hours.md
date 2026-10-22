---
title: "Watts vs Watt-Hours: How to Read Power Station Specs"
description: "Watts vs watt-hours explained simply: what W and Wh mean on a power station, how to work out runtime, and the two spec mistakes that cost buyers money."
summary: "The difference between W and Wh in plain English, with examples and a runtime formula."
keyword: "watts vs watt-hours"
published: 2026-10-22
updated: 2026-10-22
answer: "In watts vs watt-hours, watts (W) are how fast power is used at one moment, and watt-hours (Wh) are how much energy is stored or used over time. A power station's Wh tells you how long it lasts; its W tells you what it can run."
relatedTools: ["power-station-size", "appliance-wattage"]
relatedGuides: ["power-station-for-refrigerator", "lifepo4-vs-lithium-ion-power-station"]
faqs:
  - q: "Is 1,000 W the same as 1,000 Wh?"
    a: "No. 1,000 W is a rate of power — what something draws at one moment. 1,000 Wh is an amount of energy — for example 1,000 W for one hour, or 100 W for ten hours."
  - q: "How do I convert mAh to Wh?"
    a: "Multiply mAh by the battery voltage and divide by 1,000. A 20,000 mAh power bank at 3.7 V holds about 74 Wh."
  - q: "How do I work out watts from amps?"
    a: "Multiply amps by volts. US household outlets are 120 V, so a device rated 10 A draws about 1,200 W."
  - q: "How long will a power station run my device?"
    a: "Roughly capacity in Wh × 0.85 ÷ your device's watts. A 1,000 Wh power station runs a 100 W device for about 8.5 hours."
---

Understanding watts vs watt-hours is the single most useful thing you can learn before buying a power station. Almost every spec-sheet mistake comes from mixing the two up — and both numbers matter for different reasons.

## Watts: how fast power is used

**Watts (W) measure power** — the rate at which something uses electricity right now. A 10 W LED bulb uses a little; a 1,500 W kettle uses a lot.

Think of water: watts are like the **flow from a tap**. A garden hose and a fire hose can both run for an hour, but one moves far more water every second.

## Watt-hours: how much energy is stored or used

**Watt-hours (Wh) measure energy** — an amount, like the size of the water tank. The formula is simple:

> **Wh = watts × hours**

A 100 W TV switched on for 3 hours uses 300 Wh. A 10 W bulb for 5 hours uses 50 Wh. Your electric bill uses kilowatt-hours (kWh): **1 kWh = 1,000 Wh**.

## The three specs on every power station

| Spec | Unit | What it tells you |
|---|---|---|
| Capacity | Wh | How much energy the battery holds — how long it lasts |
| Continuous (rated) output | W | How much it can power at once, indefinitely |
| Surge (peak) output | W | The short burst it can give when a motor starts |

You need all three to be big enough. Capacity decides **how long**; output decides **what** you can run.

## Two expensive mistakes

**Mistake 1: thinking a high watt rating means long runtime.** A power station with 1,800 W of output and a 1,000 Wh battery can run a 1,500 W kettle — but only for about **34 minutes** (1,000 × 0.85 ÷ 1,500).

**Mistake 2: thinking a big battery can run anything.** A 3,600 Wh power station with only 300 W of output holds plenty of energy, but it **cannot start a 1,500 W kettle at all**. The kettle asks for more power than the inverter can deliver, so it shuts off.

## Working out runtime

To estimate how long a device will run:

> **Runtime (hours) ≈ capacity in Wh × 0.85 ÷ device watts**

The 0.85 accounts for roughly 15% of energy lost when the power station turns battery power into normal 120 V AC power. Here's a typical day for a few common devices:

- LED bulb: 10 W × 5 hours = **50 Wh**
- Wi-Fi router: 20 W × 24 hours = **480 Wh**
- Laptop: 60 W × 6 hours = **360 Wh**
- TV: 100 W × 4 hours = **400 Wh**
- Microwave: 1,500 W × 15 minutes = **375 Wh**

Notice the microwave: a huge wattage, but used briefly, so its daily energy is similar to a TV's.

## Surge: why motors need extra

Fridges, pumps, air conditioners and power tools have motors. When a motor starts, it draws **two to three times its running watts** for a second or two. That's why your power station's **surge rating** must be higher than the biggest motor's start-up demand — otherwise it trips every time the motor kicks in.

## Handy conversions

- **Amps to watts:** amps × volts = watts. US outlets are 120 V, so a 10 A appliance draws about 1,200 W.
- **mAh to Wh:** mAh × volts ÷ 1,000. A 20,000 mAh power bank at 3.7 V holds about 74 Wh.
- **Flying with batteries:** US airlines commonly allow lithium batteries up to 100 Wh in carry-on bags without approval — always check your airline's current rules.

## Putting it together

Add up the watts of everything you want on at the same time — that's the output you need. Add up the watt-hours of everything over the hours you'll use it — that's the capacity you need, plus about 15% for losses and a buffer for safety. Our Power Station Size Calculator does all of that for you, using typical figures you can change to match your own devices.
