# rest-rules-engine
Node and Express webserver written to extend the json-rules-engine package as a REST API

Lot of work left to do...
1) add more REST resource endpoints for a more control of json-rules-engine objects, with more http verbs
2) add support for persisting new/modified engines, rules, conditions, events via PUTs, POSTs and maybe PATCHes (pending design decisions)
3) add ability to specify external rules (other REST APIs) via json config and PUT as resource. See if this can be contributed to core json-rules-engine
4) testing
5) add web views for GUI. 
