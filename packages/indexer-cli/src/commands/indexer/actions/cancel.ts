import { GluegunToolbox } from 'gluegun'
import chalk from 'chalk'
import { resolveChainAlias } from '@graphprotocol/indexer-common'
import { loadValidatedConfig } from '../../../config'
import { createIndexerManagementClient } from '../../../client'
import { fixParameters, printObjectOrArray } from '../../../command-helpers'
import { cancelActions } from '../../../actions'

const HELP = `
${chalk.bold('graph indexer actions cancel')} [options] [<actionID1> ...]

${chalk.dim('Options:')}

  -h, --help                    Show usage information
  -o, --output table|json|yaml  Choose the output format: table (default), JSON, or YAML
`

module.exports = {
  name: 'cancel',
  alias: [],
  description: 'Cancel an item in the queue',
  run: async (toolbox: GluegunToolbox) => {
    const { print, parameters } = toolbox

    const inputSpinner = toolbox.print.spin('Processing inputs')

    const { h, help, o, output } = parameters.options
    const [...actionIDs] = fixParameters(parameters, { h, help }) || []

    const outputFormat = o || output || 'table'
    const toHelp = help || h || undefined

    if (toHelp) {
      inputSpinner.stopAndPersist({ symbol: '💁', text: HELP })
      return
    }

    let numericActionIDs: number[]

    try {
      if (!['json', 'yaml', 'table'].includes(outputFormat)) {
        throw Error(
          `Invalid output format "${outputFormat}", must be one of ['json', 'yaml', 'table']`,
        )
      }

      if (!actionIDs || actionIDs.length === 0) {
        throw Error(`Missing required argument: 'actionID'`)
      }

      numericActionIDs = actionIDs.map(action => +action)

      inputSpinner.succeed('Processed input parameters')
    } catch (error) {
      inputSpinner.fail(error.toString())
      print.info(HELP)
      process.exitCode = 1
      return
    }

    const actionSpinner = toolbox.print.spin(`Cancelling ${actionIDs.length} actions`)
    try {
      const config = loadValidatedConfig()
      const client = await createIndexerManagementClient({ url: config.api })

      const queuedAction = await cancelActions(client, numericActionIDs)

      actionSpinner.succeed(`Actions canceled`)

      // Format Actions 'protocolNetwork' field to display human-friendly chain aliases instead of CAIP2-IDs
      queuedAction.forEach(
        action => (action.protocolNetwork = resolveChainAlias(action.protocolNetwork)),
      )

      printObjectOrArray(print, outputFormat, queuedAction, [
        'id',
        'protocolNetwork',
        'type',
        'deploymentID',
        'allocationID',
        'amount',
        'poi',
        'force',
        'priority',
        'status',
        'source',
        'reason',
      ])
    } catch (error) {
      actionSpinner.fail(error.toString())
      process.exitCode = 1
      return
    }
  },
}
