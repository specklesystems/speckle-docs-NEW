import {
  Extension,
  SelectionExtension,
  ViewerEvent,
  type IViewer,
  type TreeNode
} from '@speckle/viewer'

export interface AuditSummary {
  nodes: number
  objects: number
  withGeometry: number
  sampleIds: string[]
}

/**
 * An ordinary custom extension, written against the same public API as any other:
 * a `viewer` reference, an injected `SelectionExtension`, and a viewer event. It
 * exists to prove the claim the bridge makes — that once the loader has run,
 * nothing downstream knows or cares that the data came from a bundle.
 *
 * It also shows what step 5 of the guide means in practice: the ids it reports are
 * `applicationId` values, because that is what the projection sets `id` to.
 */
export class ApplicationIdAuditExtension extends Extension {
  get inject(): Array<typeof SelectionExtension> {
    return [SelectionExtension]
  }

  private onSelection?: (summary: string) => void

  constructor(
    viewer: IViewer,
    protected selection: SelectionExtension
  ) {
    super(viewer, selection)

    this.viewer.on(ViewerEvent.ObjectClicked, () => {
      const ids = this.selection.getSelectedNodes().map((node) => node.model.id)
      this.onSelection?.(ids.length ? ids.join(', ') : 'nothing selected')
    })
  }

  reportSelectionTo(listener: (summary: string) => void): void {
    this.onSelection = listener
  }

  /**
   * Walk the world tree the loader built and count what actually arrived.
   *
   * Render views hang off the nested geometry nodes, not the atomic object nodes,
   * so counting them on `atomic` nodes alone reports zero on a model that renders
   * perfectly well.
   */
  audit(): AuditSummary {
    const summary: AuditSummary = { nodes: 0, objects: 0, withGeometry: 0, sampleIds: [] }

    this.viewer.getWorldTree().walk((node: TreeNode) => {
      summary.nodes++
      if (node.model.renderView) summary.withGeometry++
      if (node.model.atomic) {
        summary.objects++
        if (summary.sampleIds.length < 5 && node.model.raw.applicationId) {
          summary.sampleIds.push(String(node.model.raw.applicationId))
        }
      }
      return true
    })

    return summary
  }
}
