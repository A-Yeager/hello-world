/*
 * examples.js — worked examples for the Ontology Builder.
 *
 * Loaded with a plain <script> tag (window.OntologyExamples) so "Load example" works even when
 * index.html is opened straight from disk, and require()-able from Node for the CLI:
 *   node cli.js check example:cms-cpi
 */
(function (root, data) {
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.OntologyExamples = data;
})(typeof self !== 'undefined' ? self : this, {
  "cms-cpi": {
    "label": "CMS — Center for Program Integrity (sub-domains: PERM, MEQC, BEA)",
    "model": {
      "schemaVersion": 2,
      "meta": {
        "customer": "Centers for Medicare & Medicaid Services (CMS)",
        "domain": "Center for Program Integrity (CPI)",
        "owner": "<PM name, email>",
        "smes": "See sub-domains (Part 1.2)",
        "version": "v0.1",
        "status": "Draft",
        "lastUpdated": "2026-09-23",
        "approvedBy": ""
      },
      "context": {
        "whatBusinessDoes": "ILLUSTRATIVE EXAMPLE — shows how sub-domains structure an ontology. It is not an official or validated CMS model; confirm every definition with CPI SMEs before relying on it.\n\nThe Center for Program Integrity protects Medicaid and CHIP spending by measuring how much is paid improperly, checking that states determine eligibility correctly, and making sure the right people are enrolled. Each of those responsibilities is run by a different team with its own SMEs, cadence and vocabulary, which is why the model is split into sub-domains.",
        "scope": [
          {
            "inScope": "Improper payment measurement, eligibility quality control, beneficiary eligibility and enrollment",
            "outOfScope": "Provider enrollment and screening",
            "reason": "Separate program with its own discovery track"
          }
        ],
        "outcomes": [
          {
            "id": "O1",
            "outcome": "Shorten the time from sample selection to reported error findings",
            "current": "<baseline>",
            "target": "<target>",
            "owner": "PERM program lead"
          },
          {
            "id": "O2",
            "outcome": "Give MEQC reviewers a single view of an eligibility decision and its evidence",
            "current": "<baseline>",
            "target": "<target>",
            "owner": "MEQC program lead"
          }
        ],
        "sources": [
          {
            "source": "Discovery framing from the product team",
            "type": "Workshop",
            "date": "2026-09-23",
            "notes": "Sub-domain split: PERM, MEQC, BEA"
          }
        ]
      },
      "subdomains": [
        {
          "id": "SD-01",
          "code": "PERM",
          "name": "Payment Error Rate Measurement",
          "description": "Measures improper payments in Medicaid and CHIP by reviewing a statistical sample of payments from the states in each review cycle.",
          "smes": "<PERM program lead>; <PERM statistician>",
          "owner": "<PERM program team>"
        },
        {
          "id": "SD-02",
          "code": "MEQC",
          "name": "Medicaid Eligibility Quality Control",
          "description": "State-run reviews of eligibility decisions — approvals, denials and terminations — carried out between a state's PERM cycles.",
          "smes": "<MEQC program lead>; <State liaison>",
          "owner": "<MEQC program team>"
        },
        {
          "id": "SD-03",
          "code": "BEA",
          "name": "Beneficiary Eligibility & Enrollment",
          "description": "How individuals apply, are determined eligible, and are enrolled in Medicaid or CHIP.",
          "smes": "<Eligibility policy lead>; <Enrollment operations lead>",
          "owner": "<BEA program team>"
        }
      ],
      "glossary": [
        {
          "term": "Improper payment",
          "definition": "A payment that should not have been made, or was made in the wrong amount, including where documentation is insufficient to tell.",
          "synonyms": "payment error",
          "notConfuse": "Fraud — an improper payment need not be intentional"
        },
        {
          "term": "Review cycle",
          "definition": "The measurement period in which a given group of states has its payments sampled and reviewed.",
          "synonyms": "PERM cycle",
          "notConfuse": "Federal fiscal year"
        },
        {
          "term": "Eligibility determination",
          "definition": "A state's decision on whether an individual qualifies for Medicaid or CHIP.",
          "synonyms": "eligibility decision",
          "notConfuse": "Enrollment — the act of adding an eligible person to coverage"
        }
      ],
      "conventions": "",
      "objects": [
        {
          "id": "OBJ-01",
          "name": "State",
          "subdomains": [
            "SD-01",
            "SD-02",
            "SD-03"
          ],
          "description": "A state or territory Medicaid/CHIP agency. It is measured by PERM, runs MEQC reviews and makes eligibility determinations — which is why it belongs to every sub-domain and is the model's main shared object.",
          "type": "Reference",
          "aka": "",
          "owner": "CPI (all teams)",
          "systemOfRecord": "<CMS reference data>",
          "identifier": "Two-letter state code",
          "volume": "",
          "retention": "",
          "sensitivity": "Public",
          "properties": [
            {
              "name": "stateCode",
              "description": "Postal code",
              "example": "MD",
              "type": "Identifier",
              "required": "Yes",
              "derived": "",
              "source": "",
              "notes": ""
            },
            {
              "name": "name",
              "description": "State or territory name",
              "example": "Maryland",
              "type": "Text",
              "required": "Yes",
              "derived": "",
              "source": "",
              "notes": ""
            }
          ],
          "customProperties": [],
          "states": [],
          "rules": [],
          "questions": [],
          "example": ""
        },
        {
          "id": "OBJ-02",
          "name": "ReviewCycle",
          "subdomains": [
            "SD-01"
          ],
          "description": "The measurement period in which a group of states is sampled and reviewed. Findings roll up to an error rate per cycle.",
          "type": "Supporting",
          "aka": "",
          "owner": "<PERM program team>",
          "systemOfRecord": "<PERM contractor system>",
          "identifier": "Cycle identifier",
          "volume": "",
          "retention": "",
          "sensitivity": "Confidential",
          "properties": [
            {
              "name": "cycleId",
              "description": "Cycle identifier",
              "example": "RY2027",
              "type": "Identifier",
              "required": "Yes",
              "derived": "",
              "source": "",
              "notes": ""
            },
            {
              "name": "statesInCycle",
              "description": "States measured in this cycle",
              "example": "MD, VA, …",
              "type": "Reference",
              "required": "Yes",
              "derived": "",
              "source": "",
              "notes": ""
            }
          ],
          "customProperties": [],
          "states": [],
          "rules": [],
          "questions": [],
          "example": ""
        },
        {
          "id": "OBJ-03",
          "name": "SampledPayment",
          "subdomains": [
            "SD-01"
          ],
          "description": "A Medicaid or CHIP payment selected into the PERM sample for review. It exists from sample selection until its review is closed and any finding is final.",
          "type": "Core",
          "aka": "",
          "owner": "<PERM program team>",
          "systemOfRecord": "<PERM contractor system>",
          "identifier": "Sample ID",
          "volume": "",
          "retention": "",
          "sensitivity": "Confidential",
          "properties": [
            {
              "name": "sampleId",
              "description": "Sample reference",
              "example": "PERM-27-000481",
              "type": "Identifier",
              "required": "Yes",
              "derived": "",
              "source": "",
              "notes": ""
            },
            {
              "name": "paidAmount",
              "description": "Amount paid",
              "example": "412.00 USD",
              "type": "Money",
              "required": "Yes",
              "derived": "",
              "source": "",
              "notes": ""
            },
            {
              "name": "reviewStatus",
              "description": "Where the review stands",
              "example": "Under medical review",
              "type": "Enumeration",
              "required": "Yes",
              "derived": "",
              "source": "",
              "notes": ""
            }
          ],
          "customProperties": [],
          "states": [
            {
              "state": "Selected",
              "meaning": "Drawn into the sample",
              "enteredBy": "ACT-01 DrawPaymentSample",
              "exitsTo": "Under review"
            },
            {
              "state": "Finding recorded",
              "meaning": "Review complete, outcome recorded",
              "enteredBy": "ACT-02 RecordImproperPaymentFinding",
              "exitsTo": "Closed"
            }
          ],
          "rules": [],
          "questions": [],
          "example": "sampleId: PERM-27-000481\nstate: MD           # LNK via ReviewCycle\npaidAmount: 412.00 USD\nreviewStatus: Under medical review"
        },
        {
          "id": "OBJ-04",
          "name": "ImproperPaymentFinding",
          "subdomains": [
            "SD-01"
          ],
          "description": "The outcome of reviewing a sampled payment when it was paid improperly — the error type and the amount in error.",
          "type": "Core",
          "aka": "",
          "owner": "<PERM program team>",
          "systemOfRecord": "<PERM contractor system>",
          "identifier": "Finding ID",
          "volume": "",
          "retention": "",
          "sensitivity": "Confidential",
          "properties": [
            {
              "name": "findingId",
              "description": "Finding reference",
              "example": "F-000219",
              "type": "Identifier",
              "required": "Yes",
              "derived": "",
              "source": "",
              "notes": ""
            },
            {
              "name": "errorType",
              "description": "Kind of error",
              "example": "Insufficient documentation",
              "type": "Enumeration",
              "required": "Yes",
              "derived": "",
              "source": "",
              "notes": ""
            },
            {
              "name": "amountInError",
              "description": "Portion of the payment in error",
              "example": "412.00 USD",
              "type": "Money",
              "required": "Yes",
              "derived": "",
              "source": "",
              "notes": ""
            }
          ],
          "customProperties": [],
          "states": [],
          "rules": [],
          "questions": [
            {
              "question": "Is a finding amended in place on appeal, or superseded by a new finding?",
              "raisedBy": "PM",
              "owner": "<PERM program lead>",
              "due": "2026-10-07",
              "status": "Open"
            }
          ],
          "example": "findingId: F-000219\nsampleId: PERM-27-000481\nerrorType: Insufficient documentation\namountInError: 412.00 USD"
        },
        {
          "id": "OBJ-05",
          "name": "EligibilityCaseReview",
          "subdomains": [
            "SD-02"
          ],
          "description": "A state's quality-control review of one eligibility decision, checking that it was correct and properly evidenced.",
          "type": "Core",
          "aka": "",
          "owner": "<MEQC program team>",
          "systemOfRecord": "<State MEQC tooling>",
          "identifier": "Case review ID",
          "volume": "",
          "retention": "",
          "sensitivity": "Confidential",
          "properties": [
            {
              "name": "caseReviewId",
              "description": "Review reference",
              "example": "MEQC-MD-0093",
              "type": "Identifier",
              "required": "Yes",
              "derived": "",
              "source": "",
              "notes": ""
            },
            {
              "name": "outcome",
              "description": "Review conclusion",
              "example": "Correct",
              "type": "Enumeration",
              "required": "Yes",
              "derived": "",
              "source": "",
              "notes": ""
            }
          ],
          "customProperties": [],
          "states": [],
          "rules": [],
          "questions": [],
          "example": "caseReviewId: MEQC-MD-0093\nstate: MD\noutcome: Correct"
        },
        {
          "id": "OBJ-06",
          "name": "EligibilityDetermination",
          "subdomains": [
            "SD-03",
            "SD-02"
          ],
          "description": "A state's decision on whether an individual qualifies for coverage. Made in BEA and examined in MEQC, so it belongs to both.",
          "type": "Core",
          "aka": "",
          "owner": "<Eligibility policy lead>",
          "systemOfRecord": "<State eligibility system>",
          "identifier": "Determination ID",
          "volume": "",
          "retention": "",
          "sensitivity": "Confidential",
          "properties": [
            {
              "name": "determinationId",
              "description": "Determination reference",
              "example": "ED-4471902",
              "type": "Identifier",
              "required": "Yes",
              "derived": "",
              "source": "",
              "notes": ""
            },
            {
              "name": "decision",
              "description": "Approved, denied or terminated",
              "example": "Approved",
              "type": "Enumeration",
              "required": "Yes",
              "derived": "",
              "source": "",
              "notes": ""
            },
            {
              "name": "decidedOn",
              "description": "Decision date",
              "example": "2026-05-14",
              "type": "Date/time",
              "required": "Yes",
              "derived": "",
              "source": "",
              "notes": ""
            }
          ],
          "customProperties": [],
          "states": [],
          "rules": [],
          "questions": [],
          "example": "determinationId: ED-4471902\ndecision: Approved\ndecidedOn: 2026-05-14"
        },
        {
          "id": "OBJ-07",
          "name": "Beneficiary",
          "subdomains": [
            "SD-03"
          ],
          "description": "An individual enrolled in Medicaid or CHIP.",
          "type": "Core",
          "aka": "",
          "owner": "<Enrollment operations lead>",
          "systemOfRecord": "<State eligibility system>",
          "identifier": "Beneficiary ID",
          "volume": "",
          "retention": "",
          "sensitivity": "PHI",
          "properties": [
            {
              "name": "beneficiaryId",
              "description": "State-issued identifier",
              "example": "MD-00881234",
              "type": "Identifier",
              "required": "Yes",
              "derived": "",
              "source": "",
              "notes": ""
            },
            {
              "name": "enrolledSince",
              "description": "Coverage start",
              "example": "2025-01-01",
              "type": "Date/time",
              "required": "Yes",
              "derived": "",
              "source": "",
              "notes": ""
            }
          ],
          "customProperties": [],
          "states": [],
          "rules": [],
          "questions": [],
          "example": "beneficiaryId: MD-00881234\nenrolledSince: 2025-01-01"
        }
      ],
      "links": [
        {
          "id": "LNK-01",
          "source": "State",
          "verb": "is measured in",
          "target": "ReviewCycle",
          "cardinality": "0..* -> 0..*",
          "reverse": "ReviewCycle measures State",
          "required": "Yes",
          "lifecycle": "",
          "why": "Determines which states' payments are sampled",
          "mutable": "",
          "onDelete": "",
          "properties": []
        },
        {
          "id": "LNK-02",
          "source": "ReviewCycle",
          "verb": "samples",
          "target": "SampledPayment",
          "cardinality": "1 -> 1..*",
          "reverse": "SampledPayment is drawn in ReviewCycle",
          "required": "Yes",
          "lifecycle": "",
          "why": "The sample is what the error rate is computed from",
          "mutable": "",
          "onDelete": "",
          "properties": []
        },
        {
          "id": "LNK-03",
          "source": "SampledPayment",
          "verb": "results in",
          "target": "ImproperPaymentFinding",
          "cardinality": "1 -> 0..1",
          "reverse": "ImproperPaymentFinding comes from SampledPayment",
          "required": "No",
          "lifecycle": "",
          "why": "Findings are traceable to the payment reviewed",
          "mutable": "",
          "onDelete": "",
          "properties": []
        },
        {
          "id": "LNK-04",
          "source": "SampledPayment",
          "verb": "was paid on behalf of",
          "target": "Beneficiary",
          "cardinality": "1 -> 1",
          "reverse": "Beneficiary received SampledPayment",
          "required": "Yes",
          "lifecycle": "",
          "why": "Eligibility errors are found by checking the beneficiary behind the payment — PERM depends on BEA data here",
          "mutable": "",
          "onDelete": "",
          "properties": []
        },
        {
          "id": "LNK-05",
          "source": "State",
          "verb": "conducts",
          "target": "EligibilityCaseReview",
          "cardinality": "1 -> 0..*",
          "reverse": "EligibilityCaseReview is conducted by State",
          "required": "Yes",
          "lifecycle": "",
          "why": "MEQC reviews are state-run",
          "mutable": "",
          "onDelete": "",
          "properties": []
        },
        {
          "id": "LNK-06",
          "source": "EligibilityCaseReview",
          "verb": "examines",
          "target": "EligibilityDetermination",
          "cardinality": "1 -> 1",
          "reverse": "EligibilityDetermination is examined by EligibilityCaseReview",
          "required": "Yes",
          "lifecycle": "",
          "why": "The review is of this specific decision",
          "mutable": "",
          "onDelete": "",
          "properties": []
        },
        {
          "id": "LNK-07",
          "source": "Beneficiary",
          "verb": "is subject of",
          "target": "EligibilityDetermination",
          "cardinality": "1 -> 1..*",
          "reverse": "EligibilityDetermination is about Beneficiary",
          "required": "Yes",
          "lifecycle": "",
          "why": "A beneficiary's coverage rests on their latest determination",
          "mutable": "",
          "onDelete": "",
          "properties": []
        }
      ],
      "actions": [
        {
          "id": "ACT-01",
          "name": "DrawPaymentSample",
          "object": "SampledPayment",
          "actor": "<PERM statistical contractor>",
          "trigger": "Scheduled",
          "pre": "Review cycle open; state payment data received",
          "post": "Payments in Selected state",
          "frequency": "",
          "criticality": "High",
          "description": "",
          "objectsRead": "",
          "objectsModified": "",
          "linksChanged": "",
          "reversible": "",
          "sla": "",
          "audit": "",
          "steps": "",
          "rules": "",
          "failures": [],
          "acceptance": ""
        },
        {
          "id": "ACT-02",
          "name": "RecordImproperPaymentFinding",
          "object": "ImproperPaymentFinding",
          "actor": "<PERM review contractor>",
          "trigger": "Manual",
          "pre": "Sampled payment reviewed",
          "post": "Finding recorded; EVT-01 raised (supports O1)",
          "frequency": "",
          "criticality": "High",
          "description": "",
          "objectsRead": "",
          "objectsModified": "",
          "linksChanged": "",
          "reversible": "",
          "sla": "",
          "audit": "",
          "steps": "",
          "rules": "",
          "failures": [],
          "acceptance": ""
        },
        {
          "id": "ACT-03",
          "name": "ReviewEligibilityCase",
          "object": "EligibilityCaseReview",
          "actor": "<State MEQC reviewer>",
          "trigger": "Manual",
          "pre": "Case selected for MEQC review",
          "post": "Review outcome recorded (supports O2)",
          "frequency": "",
          "criticality": "High",
          "description": "",
          "objectsRead": "",
          "objectsModified": "",
          "linksChanged": "",
          "reversible": "",
          "sla": "",
          "audit": "",
          "steps": "",
          "rules": "",
          "failures": [],
          "acceptance": ""
        },
        {
          "id": "ACT-04",
          "name": "DetermineEligibility",
          "object": "EligibilityDetermination",
          "actor": "<State eligibility worker>",
          "trigger": "Manual",
          "pre": "Application complete",
          "post": "Decision recorded",
          "frequency": "",
          "criticality": "High",
          "description": "",
          "objectsRead": "",
          "objectsModified": "",
          "linksChanged": "",
          "reversible": "",
          "sla": "",
          "audit": "",
          "steps": "",
          "rules": "",
          "failures": [],
          "acceptance": ""
        },
        {
          "id": "ACT-05",
          "name": "EnrollBeneficiary",
          "object": "Beneficiary",
          "actor": "<State enrollment system>",
          "trigger": "System",
          "pre": "Determination is Approved",
          "post": "Beneficiary has active coverage",
          "frequency": "",
          "criticality": "High",
          "description": "",
          "objectsRead": "",
          "objectsModified": "",
          "linksChanged": "",
          "reversible": "",
          "sla": "",
          "audit": "",
          "steps": "",
          "rules": "",
          "failures": [],
          "acceptance": ""
        }
      ],
      "events": [
        {
          "id": "EVT-01",
          "name": "ImproperPaymentIdentified",
          "raisedBy": "ACT-02",
          "carries": "Finding ID, sample ID, error type, amount",
          "consumedBy": "Error-rate calculation; state corrective action"
        }
      ],
      "roles": [
        {
          "role": "PERM review contractor",
          "description": "Reviews sampled payments",
          "objects": "SampledPayment, ImproperPaymentFinding",
          "actions": "ACT-02",
          "constraints": "PERM data only"
        },
        {
          "role": "State MEQC reviewer",
          "description": "Runs quality-control reviews for their state",
          "objects": "EligibilityCaseReview, EligibilityDetermination",
          "actions": "ACT-03",
          "constraints": "Own state only"
        }
      ],
      "systems": [
        {
          "system": "<State eligibility system>",
          "role": "System of record",
          "mastered": "EligibilityDetermination, Beneficiary",
          "consumed": "",
          "integration": "<to confirm>",
          "notes": ""
        }
      ],
      "openQuestions": [
        {
          "question": "Does MEQC ever review determinations for beneficiaries also in a PERM sample? (LNK-04 / LNK-06)",
          "owner": "<MEQC program lead>",
          "due": "2026-10-07",
          "impact": "Shapes the PERM ↔ BEA boundary",
          "status": "Open"
        }
      ],
      "traceability": [],
      "changeLog": [
        {
          "version": "v0.1",
          "date": "2026-09-23",
          "author": "<PM>",
          "change": "Illustrative example",
          "reapproval": "—"
        }
      ],
      "signoff": []
    }
  },
  "northwind": {
    "label": "Northwind — Order to Cash (sub-domains: SALES, CREDIT)",
    "model": {
      "schemaVersion": 2,
      "meta": {
        "customer": "Northwind Components Ltd",
        "domain": "Trade Sales — Order to Cash",
        "owner": "A. Yeager, amyeager1011@gmail.com",
        "smes": "R. Patel — Head of Sales Ops; J. Moore — Credit Control",
        "version": "v0.2",
        "status": "In Review",
        "lastUpdated": "2026-09-17",
        "approvedBy": ""
      },
      "context": {
        "whatBusinessDoes": "Northwind distributes industrial components to trade customers across the UK and Ireland. Customers hold credit accounts, place orders through reps or the trade counter, and are invoiced monthly. Sales operations manage pricing agreements per account; credit control releases or holds orders based on exposure.\n\nThe order-to-cash process is currently split across a legacy ERP and a set of spreadsheets, so order approval depends on one team's working knowledge rather than recorded rules.",
        "scope": [
          {
            "inScope": "Order capture, approval and credit release",
            "outOfScope": "Warehouse pick/pack execution",
            "reason": "Owned by the 3PL under a separate contract"
          },
          {
            "inScope": "Account pricing agreements",
            "outOfScope": "Supplier purchasing",
            "reason": "Different value stream, no overlap in objects"
          }
        ],
        "outcomes": [
          {
            "id": "O1",
            "outcome": "Cut order approval turnaround",
            "current": "9 working hours median",
            "target": "Under 1 hour for 80% of orders",
            "owner": "R. Patel"
          },
          {
            "id": "O2",
            "outcome": "Remove manual credit checks for low-risk orders",
            "current": "100% manually reviewed",
            "target": "Auto-release under £5k within limit",
            "owner": "J. Moore"
          }
        ],
        "sources": [
          {
            "source": "Discovery workshop — Sales Ops",
            "type": "Workshop",
            "date": "2026-09-08",
            "notes": "Objects and lifecycle states agreed"
          },
          {
            "source": "Legacy ERP schema export",
            "type": "System artifact",
            "date": "2026-09-10",
            "notes": "Confirmed identifiers and volumes"
          }
        ]
      },
      "glossary": [
        {
          "term": "Account",
          "definition": "A credit relationship with a trade customer, against which orders are placed and invoiced.",
          "synonyms": "customer, trading account",
          "notConfuse": "Contact — a person at the account"
        },
        {
          "term": "Order",
          "definition": "A customer's committed request for goods at agreed prices.",
          "synonyms": "sales order, job",
          "notConfuse": "Quote — not yet committed"
        },
        {
          "term": "Credit release",
          "definition": "The decision that an order may proceed given the account's current exposure.",
          "synonyms": "credit approval",
          "notConfuse": "Order approval — commercial sign-off on discount"
        }
      ],
      "conventions": "",
      "objects": [
        {
          "id": "OBJ-01",
          "name": "Account",
          "description": "A trade customer's credit relationship with Northwind. An Account comes into existence when credit control approves an application, and stays live until it is closed or dormant for 24 months. Everything the business prices, invoices and chases hangs off the Account rather than the individual person placing an order.",
          "type": "Core",
          "aka": "Customer, trading account",
          "owner": "Credit Control",
          "systemOfRecord": "Legacy ERP (SAGE-X3)",
          "identifier": "Account Number (ACC-nnnnn), customer-facing",
          "volume": "11,400 live; +60/month",
          "retention": "7 years after closure (HMRC)",
          "sensitivity": "Confidential",
          "properties": [
            {
              "name": "accountNumber",
              "description": "Customer-facing account reference",
              "example": "ACC-01882",
              "type": "Identifier",
              "required": "Yes",
              "derived": "",
              "source": "ERP",
              "notes": "Immutable once issued"
            },
            {
              "name": "tradingName",
              "description": "Name the customer trades under",
              "example": "Hallam Engineering",
              "type": "Text",
              "required": "Yes",
              "derived": "",
              "source": "ERP",
              "notes": ""
            },
            {
              "name": "creditLimit",
              "description": "Maximum outstanding exposure permitted",
              "example": "25,000.00 GBP",
              "type": "Money",
              "required": "Yes",
              "derived": "",
              "source": "Credit Control",
              "notes": "Reviewed annually"
            },
            {
              "name": "currentExposure",
              "description": "Unpaid invoices plus released, uninvoiced orders",
              "example": "18,420.00 GBP",
              "type": "Money",
              "required": "Yes",
              "derived": "SUM(invoice.outstanding) + SUM(order.releasedValue)",
              "source": "Derived",
              "notes": "Drives ACT-03"
            },
            {
              "name": "status",
              "description": "Whether the account may trade",
              "example": "Active",
              "type": "Enumeration",
              "required": "Yes",
              "derived": "",
              "source": "ERP",
              "notes": "See states"
            }
          ],
          "customProperties": [
            {
              "name": "irishVatNumber",
              "description": "VAT registration for ROI-based accounts",
              "why": "Required for cross-border invoicing since 2021",
              "appliesWhen": "Account country = IE"
            }
          ],
          "states": [
            {
              "state": "Active",
              "meaning": "May place orders within limit",
              "enteredBy": "ACT-05 OpenAccount",
              "exitsTo": "On hold, Closed"
            },
            {
              "state": "On hold",
              "meaning": "Orders blocked pending payment",
              "enteredBy": "ACT-06 PlaceAccountOnHold",
              "exitsTo": "Active, Closed"
            }
          ],
          "rules": [
            {
              "id": "RULE-01",
              "rule": "An Account on hold cannot have orders released.",
              "when": "On credit release",
              "consequence": "Order stays Awaiting credit; credit control notified"
            }
          ],
          "questions": [
            {
              "question": "Do group accounts share a single credit limit or one per subsidiary?",
              "raisedBy": "PM",
              "owner": "J. Moore",
              "due": "2026-09-24",
              "status": "Open"
            }
          ],
          "example": "accountNumber: ACC-01882\ntradingName: Hallam Engineering\ncreditLimit: 25000.00 GBP\ncurrentExposure: 18420.00 GBP\nstatus: Active",
          "subdomains": [
            "SD-01",
            "SD-02"
          ]
        },
        {
          "id": "OBJ-02",
          "name": "Order",
          "description": "A customer's committed request for goods at agreed prices. An Order exists from the moment a rep or the trade counter confirms the customer wants the goods, and stops mattering once it is fully invoiced or cancelled. It is the unit the business plans fulfilment and revenue around.",
          "type": "Core",
          "aka": "Sales order, job",
          "owner": "Sales Operations",
          "systemOfRecord": "Legacy ERP (SAGE-X3)",
          "identifier": "Order Number (ORD-nnnnn)",
          "volume": "~1,900/week",
          "retention": "7 years",
          "sensitivity": "Internal",
          "properties": [
            {
              "name": "orderNumber",
              "description": "Customer-facing order reference",
              "example": "ORD-10023",
              "type": "Identifier",
              "required": "Yes",
              "derived": "",
              "source": "ERP",
              "notes": "Immutable once issued"
            },
            {
              "name": "placedAt",
              "description": "When the customer committed",
              "example": "2026-03-04T09:12Z",
              "type": "Date/time",
              "required": "Yes",
              "derived": "",
              "source": "Order capture",
              "notes": "UTC"
            },
            {
              "name": "totalValue",
              "description": "Sum of line values excluding VAT",
              "example": "1,420.00 GBP",
              "type": "Money",
              "required": "Yes",
              "derived": "SUM(orderLine.value)",
              "source": "Derived",
              "notes": "One currency per order"
            },
            {
              "name": "discountPercent",
              "description": "Discount applied beyond the account's agreement",
              "example": "5",
              "type": "Number",
              "required": "No",
              "derived": "",
              "source": "Rep",
              "notes": "Above 10% needs ACT-02"
            },
            {
              "name": "status",
              "description": "Where the order is in its lifecycle",
              "example": "Awaiting credit",
              "type": "Enumeration",
              "required": "Yes",
              "derived": "",
              "source": "ERP",
              "notes": "See states"
            }
          ],
          "customProperties": [],
          "states": [
            {
              "state": "Draft",
              "meaning": "Being built, not yet committed",
              "enteredBy": "ACT-01 CreateOrder",
              "exitsTo": "Awaiting credit, Cancelled"
            },
            {
              "state": "Awaiting credit",
              "meaning": "Committed, pending credit release",
              "enteredBy": "ACT-01 CreateOrder",
              "exitsTo": "Released, Held"
            },
            {
              "state": "Released",
              "meaning": "Cleared for fulfilment",
              "enteredBy": "ACT-03 ReleaseOrderForFulfilment",
              "exitsTo": "Invoiced, Cancelled"
            }
          ],
          "rules": [
            {
              "id": "RULE-02",
              "rule": "An Order cannot leave Draft without at least one line.",
              "when": "On commit",
              "consequence": "Reject with message"
            },
            {
              "id": "RULE-03",
              "rule": "Discount above 10% requires commercial approval before credit release.",
              "when": "On commit",
              "consequence": "Route to ACT-02"
            }
          ],
          "questions": [],
          "example": "orderNumber: ORD-10023\naccountNumber: ACC-01882   # LNK-01\nplacedAt: 2026-03-04T09:12Z\ntotalValue: 1420.00 GBP\ndiscountPercent: 5\nstatus: Awaiting credit",
          "subdomains": [
            "SD-01",
            "SD-02"
          ]
        },
        {
          "id": "OBJ-03",
          "name": "OrderLine",
          "description": "One product at one price and quantity within an Order. Lines exist only as part of an Order and are the level at which pricing agreements and stock allocation apply.",
          "type": "Supporting",
          "aka": "Line item",
          "owner": "Sales Operations",
          "systemOfRecord": "Legacy ERP (SAGE-X3)",
          "identifier": "Order Number + line sequence",
          "volume": "~4.2 lines per order",
          "retention": "With parent Order",
          "sensitivity": "Internal",
          "properties": [
            {
              "name": "sequence",
              "description": "Position within the order",
              "example": "3",
              "type": "Number",
              "required": "Yes",
              "derived": "",
              "source": "ERP",
              "notes": ""
            },
            {
              "name": "productCode",
              "description": "Item ordered",
              "example": "NW-4410",
              "type": "Reference",
              "required": "Yes",
              "derived": "",
              "source": "Product catalogue",
              "notes": ""
            },
            {
              "name": "quantity",
              "description": "Units ordered",
              "example": "24",
              "type": "Number",
              "required": "Yes",
              "derived": "",
              "source": "Order capture",
              "notes": "Whole units only"
            },
            {
              "name": "unitPrice",
              "description": "Agreed price per unit ex-VAT",
              "example": "14.80 GBP",
              "type": "Money",
              "required": "Yes",
              "derived": "",
              "source": "Pricing agreement",
              "notes": ""
            },
            {
              "name": "value",
              "description": "Line value ex-VAT",
              "example": "355.20 GBP",
              "type": "Money",
              "required": "Yes",
              "derived": "quantity * unitPrice",
              "source": "Derived",
              "notes": ""
            }
          ],
          "customProperties": [],
          "states": [],
          "rules": [],
          "questions": [],
          "example": "",
          "subdomains": [
            "SD-01"
          ]
        }
      ],
      "links": [
        {
          "id": "LNK-01",
          "source": "Account",
          "verb": "places",
          "target": "Order",
          "cardinality": "1 -> 0..*",
          "reverse": "Order is placed by Account",
          "required": "Yes",
          "lifecycle": "An Order cannot exist without an Account",
          "why": "Drives pricing, credit exposure and invoicing",
          "mutable": "An Order may be reassigned to another Account before release only",
          "onDelete": "Accounts are never deleted, only closed; orders are retained",
          "properties": []
        },
        {
          "id": "LNK-02",
          "source": "Order",
          "verb": "contains",
          "target": "OrderLine",
          "cardinality": "1 -> 1..*",
          "reverse": "OrderLine belongs to Order",
          "required": "Yes",
          "lifecycle": "Lines are cancelled with their Order",
          "why": "Line values roll up to order value and credit exposure",
          "mutable": "Lines may change while Draft",
          "onDelete": "Cascade",
          "properties": []
        }
      ],
      "actions": [
        {
          "id": "ACT-01",
          "name": "CreateOrder",
          "object": "Order",
          "actor": "Sales Rep or Trade Counter",
          "trigger": "Manual",
          "pre": "Account status is Active; at least one line added",
          "post": "Order exists in Awaiting credit; exposure recalculated",
          "frequency": "~1,900/week",
          "criticality": "High",
          "description": "Captures a customer's commitment to buy at agreed prices, so fulfilment and credit can act on it.",
          "objectsRead": "Account, Product catalogue, Pricing agreement",
          "objectsModified": "Order (Draft -> Awaiting credit), OrderLine",
          "linksChanged": "LNK-01 Account places Order; LNK-02 Order contains OrderLine",
          "reversible": "Yes — via ACT-04 CancelOrder while not invoiced",
          "sla": "Immediate",
          "audit": "Who, when, discount applied — 7 years",
          "steps": "Select the account and confirm it is active\nAdd lines, applying the account's pricing agreement\nCommit the order",
          "rules": "RULE-02, RULE-03",
          "failures": [
            {
              "condition": "Account is on hold",
              "handling": "Order saved as Draft; credit control notified"
            },
            {
              "condition": "Discount above 10%",
              "handling": "Routed to ACT-02 before credit release"
            }
          ],
          "acceptance": "Given an active account with a pricing agreement, when a rep commits an order with two lines, then the order is Awaiting credit and its value equals the sum of line values\nGiven an account on hold, when a rep commits an order, then the order stays Draft and credit control is notified"
        },
        {
          "id": "ACT-03",
          "name": "ReleaseOrderForFulfilment",
          "object": "Order",
          "actor": "Credit Controller, or the system when auto-release rules are met",
          "trigger": "Event",
          "pre": "Order is Awaiting credit; account is Active; exposure plus order value is within credit limit",
          "post": "Order is Released; account exposure includes the order (supports O1 and O2)",
          "frequency": "~1,900/week",
          "criticality": "High",
          "description": "Decides whether an order may proceed given the account's current exposure — today a manual check on every order, which is what O2 targets.",
          "objectsRead": "Account, Order",
          "objectsModified": "Order (Awaiting credit -> Released), Account.currentExposure",
          "linksChanged": "None",
          "reversible": "Yes — via ACT-06 PlaceAccountOnHold, which re-holds unfulfilled orders",
          "sla": "Within 1 hour for orders under £5k (target)",
          "audit": "Decision, decider, exposure at the time — 7 years",
          "steps": "Recalculate account exposure\nCompare exposure plus order value against the credit limit\nRelease, or hold and notify the rep",
          "rules": "RULE-01",
          "failures": [
            {
              "condition": "Exposure plus order value exceeds the limit",
              "handling": "Order held; credit control and rep notified with the shortfall"
            }
          ],
          "acceptance": "Given an active account £5,000 below its limit, when a £2,000 order is released, then exposure increases by £2,000 and the order is Released\nGiven an account on hold, when release is attempted, then the order stays Awaiting credit"
        }
      ],
      "events": [
        {
          "id": "EVT-01",
          "name": "OrderReleased",
          "raisedBy": "ACT-03",
          "carries": "Order ID, account, value, decided by, timestamp",
          "consumedBy": "Fulfilment (3PL), Invoicing"
        }
      ],
      "roles": [
        {
          "role": "Sales Rep",
          "description": "Field sales, owns a set of accounts",
          "objects": "Own Accounts, their Orders",
          "actions": "ACT-01, ACT-04",
          "constraints": "Own accounts only; discount capped at 10%"
        },
        {
          "role": "Credit Controller",
          "description": "Manages exposure and collections",
          "objects": "All Accounts, all Orders",
          "actions": "ACT-03, ACT-05, ACT-06",
          "constraints": "Cannot create orders"
        },
        {
          "role": "Fulfilment System (3PL)",
          "description": "Non-human actor consuming released orders",
          "objects": "Released Orders",
          "actions": "None — read only",
          "constraints": "Polls every 15 minutes"
        }
      ],
      "systems": [
        {
          "system": "Legacy ERP (SAGE-X3)",
          "role": "System of record",
          "mastered": "Account, Order, OrderLine",
          "consumed": "Product catalogue",
          "integration": "Nightly file export, ODBC read",
          "notes": "No outbound events today — a constraint on O1"
        },
        {
          "system": "3PL WMS",
          "role": "Fulfilment",
          "mastered": "Shipment",
          "consumed": "Order",
          "integration": "SFTP drop, 15-minute poll",
          "notes": ""
        }
      ],
      "openQuestions": [
        {
          "question": "Is auto-release (O2) acceptable to the auditors without a second pair of eyes?",
          "owner": "J. Moore",
          "due": "2026-09-26",
          "impact": "Blocks the ACT-03 rules",
          "status": "Open"
        }
      ],
      "traceability": [
        {
          "ontologyId": "OBJ-02",
          "requirement": "REQ-14 Order capture",
          "spec": "SPEC-Order",
          "component": "order-service",
          "tests": "order-service/test/create-order.spec"
        },
        {
          "ontologyId": "ACT-03",
          "requirement": "REQ-21 Auto credit release",
          "spec": "SPEC-CreditRelease",
          "component": "credit-service",
          "tests": "credit-service/test/release.spec"
        }
      ],
      "changeLog": [
        {
          "version": "v0.1",
          "date": "2026-09-09",
          "author": "A. Yeager",
          "change": "Initial draft from discovery workshop",
          "reapproval": "—"
        },
        {
          "version": "v0.2",
          "date": "2026-09-17",
          "author": "A. Yeager",
          "change": "Added credit release action and account states",
          "reapproval": "Yes"
        }
      ],
      "signoff": [
        {
          "name": "R. Patel",
          "role": "Business sponsor",
          "org": "Northwind Components Ltd",
          "date": "",
          "reference": ""
        }
      ],
      "subdomains": [
        {
          "id": "SD-01",
          "code": "SALES",
          "name": "Sales Operations",
          "description": "Order capture, pricing agreements and the account relationship day to day.",
          "smes": "R. Patel — Head of Sales Ops",
          "owner": "Sales Operations"
        },
        {
          "id": "SD-02",
          "code": "CREDIT",
          "name": "Credit Control",
          "description": "Credit limits, exposure, and the decision to release or hold orders.",
          "smes": "J. Moore — Credit Control",
          "owner": "Credit Control"
        }
      ]
    }
  }
});
