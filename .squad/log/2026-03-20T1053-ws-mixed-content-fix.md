# Session Log: WebSocket Mixed-Content Fix

**Date:** 2026-03-20T10:53:00Z  
**Agent:** Drizzt

## Summary

Fixed hardcoded `ws://` WebSocket URL in client connection service. Browser blocked mixed-content requests when deployed to Azure HTTPS. Auto-detect protocol from page origin; use `wss://` for HTTPS, `ws://` for local HTTP dev.

**Status:** ✅ Complete  
**Tests:** 628 pass  
**Branches:** dev, uat
