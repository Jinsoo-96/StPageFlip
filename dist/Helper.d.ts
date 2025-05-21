import { Point, Rect, Segment } from './BasicTypes';
/**
 * A class containing helping mathematical methods
 */
export declare class Helper {
    /**
     * Get the distance between two points
     *
     * @param {Point} point1
     * @param {Point} point2
     */
    static GetDistanceBetweenTwoPoint(point1: Point, point2: Point): number;
    /**
     * Get the length of the line segment
     *
     * @param {Segment} segment
     */
    static GetSegmentLength(segment: Segment): number;
    /**
     * Get the angle between two lines
     *
     * @param {Segment} line1
     * @param {Segment} line2
     */
    static GetAngleBetweenTwoLine(line1: Segment, line2: Segment): number;
    /**
     * Check for a point in a rectangle
     *
     * @param {Rect} rect
     * @param {Point} pos
     *
     * @returns {Point} If the point enters the rectangle its coordinates will be returned, otherwise - null
     */
    static PointInRect(rect: Rect, pos: Point): Point;
    /**
     * Transform point coordinates to a given angle
     *
     * @param {Point} transformedPoint - Point to rotate
     * @param {Point} startPoint - Transformation reference point
     * @param {number} angle - Rotation angle (in radians)
     *
     * @returns {Point} Point coordinates after rotation
     */
    static GetRotatedPoint(transformedPoint: Point, startPoint: Point, angle: number): Point;
    /**
     * Limit a point "linePoint" to a given circle centered at point "startPoint" and a given radius
     *
     * @param {Point} startPoint - Circle center
     * @param {number} radius - Circle radius
     * @param {Point} limitedPoint - Сhecked point
     *
     * @returns {Point} If "linePoint" enters the circle, then its coordinates are returned.
     * Else will be returned the intersection point between the line ([startPoint, linePoint]) and the circle
     */
    static LimitPointToCircle(startPoint: Point, radius: number, limitedPoint: Point): Point;
    /**
     * Find the intersection of two lines bounded by a rectangle "rectBorder"
     *
     * @param {Rect} rectBorder
     * @param {Segment} one
     * @param {Segment} two
     *
     * @returns {Point} The intersection point, or "null" if it does not exist, or it lies outside the rectangle "rectBorder"
     */
    static GetIntersectBetweenTwoSegment(rectBorder: Rect, one: Segment, two: Segment): Point;
    /**
     * Find the intersection point of two lines
     *
     * @param one
     * @param two
     *
     * @returns {Point} The intersection point, or "null" if it does not exist
     * @throws Error if the segments are on the same line
     */
    static GetIntersectBeetwenTwoLine(one: Segment, two: Segment): Point;
    /**
     * Get a list of coordinates (step: 1px) between two points
     *
     * @param pointOne
     * @param pointTwo
     *
     * @returns {Point[]}
     */
    static GetCordsFromTwoPoint(pointOne: Point, pointTwo: Point): Point[];
}
