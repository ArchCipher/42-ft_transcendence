## A collaborative platform with real-time features
- Real-time collaboration (multiple peers editing the same document concurrently)
- True CRDT design (insert/delete ops everywhere)
- Core correctness properties as first-class deliverables
	- Idempotency: re-delivered operations don’t change final state
	- Causal/ordering handling: how you apply ops when they arrive out of order
	- Convergence: all peers end up with the same document state
	- Conflict handling: concurrent inserts/deletes resolve deterministically

## CRDT

