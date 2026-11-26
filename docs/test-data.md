# Test data

Records that look real, with their links — for tests and demos.

<video src="media/video/06-test-data.mp4" controls muted preload="metadata" poster="media/poster/06-test-data.jpg"></video>

## Plan

![Plan](media/gif/test-data.gif)

Choose objects and how many, and what goes under each: 5 accounts with 3 contacts and 2 opportunities each. Parents are made first and every link is filled in. **Records above** lists the objects a top-level object can go under (its lookups, required ones first).

## Field rules

| Rule | Gives |
| --- | --- |
| **Auto** | from the field's type and name: companies, people, e-mails, phones, cities, dates, amounts, valid picklist values |
| **Leave empty** | nothing |
| **Fixed value** | the same value everywhere |
| **One of a list** / **weighted** | `Gold, Silver` · `Gold 20%, Silver 80%` |
| **Pattern** | `INV-{0000}`, `{parent.Name}`; tick **with random added** to put a made-up value after it |
| **Range** / **Days from today** | numbers, dates |
| **Records found by a query** | a lookup to existing records |

E-mails and websites always use `example.com`.

## Check without saving

The records are tried in the org inside one Apex transaction that is **rolled back**: validation rules, required fields, triggers and flows run, nothing stays. What would fail is listed with Salesforce's own message; leave those out or change the rules.

![Check, then create](media/gif/check-and-create.gif)

## Use it

- **Create in the org** — after typing its name.
- **CSV** files per object.
- An `@IsTest` **test data factory** class.
- A **recipe** to make the same kind of data again (Recipes).
- In a test: the **Make test data** step — records are `{{a-1}}`, `{{a-1.Name}}`, and are deleted after the test.

## Find & clone

Find records (words in the name, or a condition), pick them, add objects under them, choose how many copies and a pattern for their names. They become a preview like a plan's. Cloning into another org leaves out fields it lacks and links to records of the first org.

## Batches

![Batches](media/gif/batches.gif)

Every record NomadQA created, by run, saved while it is made (**Stop** keeps what was made). Show records per object (filters, columns, CSV/JSON), count what is still there, and delete a batch (children first).

## Automation switch

The org's own bypass — a hierarchy custom setting or a custom permission named like "bypass" — is found, with the validation rules and triggers that check it, turned on for you only while creating, then put back exactly as it was. NomadQA never changes automation itself.
