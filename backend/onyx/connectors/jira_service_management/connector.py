import abc
from typing import Any, Iterator
from onyx.connectors.interfaces import PollConnector, GenerateDocumentsOutput, SecondsSinceUnixEpoch
from onyx.connectors.models import Document
from onyx.connectors.jira.utils import (
    build_jira_client,
    extract_text_from_adf,
    best_effort_get_field_from_issue,
)
from onyx.configs.app_configs import JIRA_SLIM_PAGE_SIZE

class JSMConnector(PollConnector):
    """
    Connector for Jira Service Management.
    Uses the standard Jira client but optimized for JSM issues.
    """

    def __init__(self, **kwargs):
        self.credentials = {}
        self.base_url = kwargs.get("base_url")
        self.project_key = kwargs.get("project_key")
        self.query = kwargs.get("query", "")

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.credentials = credentials
        return credentials

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        """
        Polls JSM for new or updated issues within the given time range.
        """
        jira = build_jira_client(
            self.credentials, 
            self.base_url, 
            scoped_token=False
        )

        # Construct JQL. JSM issues are usually filtered by project and updated time.
        # We use the start/end timestamps provided by the poller.
        jql = f'project = "{self.project_key}" AND updated >= "{start}" AND updated <= "{end}"'
        if self.query:
            jql += f" AND {self.query}"

        # Fetch issues using the jira library
        issues = jira.search(jql, maxResults=JIRA_SLIM_PAGE_SIZE)
        
        docs = []
        for issue in issues:
            # Extract content, handling ADF format for descriptions/comments
            description_adf = best_effort_get_field_from_issue(issue, "description")
            description_text = extract_text_from_adf(description_adf) if description_adf else ""
            
            # Create the Document object
            doc = Document(
                id=issue.key,
                title=issue.fields.summary,
                content=description_text,
                source=f"{self.base_url}/browse/{issue.key}",
                metadata={
                    "status": issue.fields.status.name,
                    "reporter": issue.fields.reporter.displayName,
                    "priority": issue.fields.priority.name if hasattr(issue.fields, "priority") else "None",
                    "custom_fields": {
                        "description_raw": description_adf
                    }
                }
            )
            docs.append(doc)

        return iter(docs)

    def load_from_state(self) -> Iterator[list[Document]]:
        """
        Initial load of documents from the source.
        """
        # For initial load, we fetch all issues in the project.
        jira = build_jira_client(
            self.credentials, 
            self.base_url, 
            scoped_token=False
        )
        
        jql = f'project = "{self.project_key}"'
        if self.query:
            jql += f" AND {self.query}"

        issues = jira.search(jql, maxResults=JIRA_SLIM_PAGE_SIZE)
        
        docs = []
        for issue in issues:
            description_adf = best_effort_get_field_from_issue(issue, "description")
            description_text = extract_text_from_adf(description_adf) if description_adf else ""
            
            doc = Document(
                id=issue.key,
                title=issue.fields.summary,
                content=description_text,
                source=f"{self.base_url}/browse/{issue.key}",
                metadata={
                    "status": issue.fields.status.name,
                    "reporter": issue.fields.reporter.displayName,
                    "priority": issue.fields.priority.name if hasattr(issue.fields, "priority") else "None",
                }
            )
            docs.append(doc)

        return iter(docs)

if __name__ == "__main__":
    # Quick sanity check
    print("JSMConnector class defined successfully.")