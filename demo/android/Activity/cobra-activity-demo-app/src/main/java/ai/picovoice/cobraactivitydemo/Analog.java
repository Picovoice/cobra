package ai.picovoice.cobraactivitydemo;

import android.content.Context;
import android.content.res.TypedArray;
import android.graphics.Canvas;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.View;

public class Analog extends View {
    private static final float ALPHA = 0.5f;
    private float value = 0;
    private float radius;

    private final int startAngle;
    private final int endAngle;
    private final float threshold;

    private final Path belowPath;
    private final Paint belowPaint;
    private final RectF below;

    private final Path abovePath;
    private final Paint abovePaint;
    private final RectF above;

    private final Matrix matrix;
    private final Path needle;
    private final Paint needlePaint;

    public Analog(Context context, AttributeSet attrs) {
        super(context, attrs);
        TypedArray a = context.getTheme().obtainStyledAttributes(
                attrs,
                R.styleable.Analog,
                0, 0
        );

        try {
            this.startAngle = a.getInt(R.styleable.Analog_startAngle, 0);
            this.endAngle = a.getInt(R.styleable.Analog_endAngle, 0);
            this.threshold = a.getFloat(R.styleable.Analog_threshold, 0);
        } finally {
            a.recycle();
        }

        belowPath = new Path();
        below = new RectF();
        belowPaint = new Paint();
        belowPaint.setStyle(Paint.Style.STROKE);
        belowPaint.setStrokeWidth(20);
        belowPaint.setStrokeCap(Paint.Cap.ROUND);
        belowPaint.setColor(getResources().getColor(R.color.colorSecondary));

        abovePath = new Path();
        above = new RectF();
        abovePaint = new Paint();
        abovePaint.setStyle(Paint.Style.STROKE);
        abovePaint.setStrokeWidth(20);
        abovePaint.setStrokeCap(Paint.Cap.ROUND);
        abovePaint.setColor(getResources().getColor(R.color.colorPrimary));

        matrix = new Matrix();
        needle = new Path();
        needlePaint = new Paint();
        needlePaint.setColor(getResources().getColor(R.color.colorSecondary));
        needlePaint.setStyle(Paint.Style.FILL_AND_STROKE);
    }

    @Override
    protected void onDraw(Canvas canvas) {
        int centerX = this.getWidth() / 2;
        int centerY = this.getBottom() - 20;

        this.radius = centerX - 10;
        drawArcs(canvas, centerX, centerY);
        drawNeedle(canvas, centerX, centerY);
    }

    public void reset() {
        while (this.value > 0.001) {
            this.setValue(0);
            this.invalidate();
        }
    }

    public void setValue(float value) {
        this.value = (ALPHA * value) + ((1 - ALPHA) * this.value);
    }

    private void drawArcs(Canvas canvas, int x, int y) {
        below.set(
                x - radius,
                y - radius,
                x + radius,
                y + radius
        );
        belowPath.arcTo(below, startAngle * threshold, endAngle, true);
        canvas.drawPath(belowPath, belowPaint);

        above.set(
                x - radius,
                y - radius,
                x + radius,
                y + radius
        );
        abovePath.arcTo(above, (startAngle * threshold) - startAngle, endAngle, true);
        canvas.drawPath(abovePath, abovePaint);
    }

    private void drawNeedle(Canvas canvas, int x, int y) {
        needle.reset();
        needle.moveTo(radius - 10, 0);
        needle.lineTo(0, -10);
        needle.lineTo(-10, 0);
        needle.lineTo(0, 10);
        needle.lineTo(radius - 10, 0);

        if (this.value >= this.threshold) {
            needlePaint.setColor(getResources().getColor(R.color.colorPrimary));
        } else {
            needlePaint.setColor(getResources().getColor(R.color.colorSecondary));
        }

        matrix.setTranslate(x, y);
        matrix.preRotate(-180 + (180 * this.value));
        needle.transform(matrix);
        canvas.drawPath(needle, needlePaint);
    }
}
