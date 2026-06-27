                           Users
                             |
          -----------------------------------------
          |                                       |
      React Web                            React Native
          |                                       |
          ------------ Shell Microfrontend --------
                             |
                        API Gateway
                             |
      ---------------------------------------------------
      |        |         |         |        |           |
    Auth     User      Chat     Document   Admin   Analytics
      |        |         |         |        |           |
      ---------------------------------------------------
                             |
                        AI Gateway
                             |
                         AI Kernel
                             |
 ---------------------------------------------------------------
 |          |           |          |          |                |
Agents    Skills   Instructions   Hooks    Memory      Guardrails
                             |
                        Model Router
                             |
             -----------------------------------
             |                 |               |
          OpenAI        GitHub Models      Local LLM
                             |
                       MCP Registry
                             |
 ---------------------------------------------------------------
 |          |          |          |         |                  |
GitHub   Weather   Filesystem   News      RAG           Calculator
                             |
 ---------------------------------------------------------------
 |               |              |                             |
PostgreSQL     MongoDB        Redis                      ChromaDB