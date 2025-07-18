# Generated by Django 4.2.23 on 2025-06-27 03:01

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="SOSImage",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("image", models.ImageField(upload_to="sos_images/")),
                (
                    "description",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                (
                    "sos_request",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="images",
                        to="api.sos",
                    ),
                ),
            ],
            options={
                "verbose_name": "SOS Image",
                "verbose_name_plural": "SOS Images",
            },
        ),
    ]
