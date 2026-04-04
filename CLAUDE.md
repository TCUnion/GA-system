# CLAUDE.md - GA-system

This file provides guidance to Claude Code when working with this repository.

## 會話規則

每次新對話開始時，必須依序讀取：
1. Obsidian vault `brain/SESSION_HANDOFF.md`（全域）— 確認整體狀態
2. Obsidian vault `brain/handoffs/GA-system.md`（本專案）— 讀取詳細進度與待辦

收工時更新 `brain/handoffs/GA-system.md` 的進度。

---

## 專案概述

南庄山水 GA4 數據儀表板，深色主題搭配玻璃擬態設計風格。

- **技術棧**：React + TypeScript
- **後端**：`backend/` 目錄
- **n8n 整合**：`n8n/` 目錄

## 基本規則

- 語言：繁體中文
- 讀檔案前先讀，修改前先了解現有結構
- 禁止刪除任何檔案，除非明確說「請刪掉」
