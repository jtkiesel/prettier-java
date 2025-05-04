import findLast from "lodash/findLast.js";

function isFormatterOffOnComment(comment) {
  return comment.image.match(
    /(\/\/(\s*)@formatter:(off|on)(\s*))|(\/\*(\s*)@formatter:(off|on)(\s*)\*\/)/gm
  );
}

/**
 * Create pairs of formatter:off and formatter:on
 * @param comments
 * @returns pairs of formatter:off and formatter:on
 */
export function matchFormatterOffOnPairs(comments) {
  const onOffComments = comments.filter(comment =>
    isFormatterOffOnComment(comment)
  );

  let isPreviousCommentOff = false;
  let isCurrentCommentOff = true;
  const pairs = [];
  let paired = {};
  onOffComments.forEach(comment => {
    isCurrentCommentOff = comment.image.slice(-3) === "off";

    if (!isPreviousCommentOff) {
      if (isCurrentCommentOff) {
        paired.off = comment;
      }
    } else {
      if (!isCurrentCommentOff) {
        paired.on = comment;
        pairs.push(paired);
        paired = {};
      }
    }
    isPreviousCommentOff = isCurrentCommentOff;
  });

  if (onOffComments.length > 0 && isCurrentCommentOff) {
    paired.on = undefined;
    pairs.push(paired);
  }

  return pairs;
}

/**
 * Check if the node is between formatter:off and formatter:on and change his ignore state
 * @param node
 * @param commentPairs
 */
export function shouldNotFormat(node, commentPairs) {
  const matchingPair = findLast(
    commentPairs,
    comment => comment.off.endOffset < node.location.startOffset
  );
  if (
    matchingPair !== undefined &&
    (matchingPair.on === undefined ||
      matchingPair.on.startOffset > node.location.endOffset)
  ) {
    node.ignore = true;
  }
}
